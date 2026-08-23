'use client';

import { useEffect, useRef, useState } from 'react';

// GLOBAL PROPAGATION MAP — the hero-scale companion to the IonosphereWitness stat
// panel. Same underlying data (HamSCI/WSPR), same honesty rules — this just gives
// it room-filling visual scale instead of a small stat line.
//
// DESIGN CHOICE (flat equirectangular, not a rotating 3D globe): a flat projection
// makes each arc a straight 2-point line between two projected (x,y) coordinates —
// cheap to compute and cheap to render even with dozens of simultaneous animated
// arcs. A rotating 3D globe needs great-circle curve geometry re-projected onto a
// sphere every frame plus continuous camera/globe rotation math — more surface area
// for both bugs and dropped frames for a live demo visualization with a hard
// performance requirement. Reliability was chosen over visual maximalism.
//
// PERFORMANCE PATTERN: a fixed pool of pre-allocated Line/Points objects, recycled
// (never created/destroyed per spot) — this is the standard fix for the usual
// Three.js performance trap of allocating new geometry every frame.

interface Spot {
  tx_call: string;
  tx_lat: number;
  tx_lon: number;
  rx_call: string;
  rx_lat: number;
  rx_lon: number;
  freq_hz: number;
  band_m: number;
  distance_km: number;
  time: string;
}

interface GlobalMapResponse {
  spots: Spot[];
  sample_size: number;
  requested_limit: number;
  hourly_total: number | null;
  data_freshness: 'live' | 'cache' | 'fixture' | 'none';
  fetched_at: string;
  attribution: string;
  coverage_note: string;
}

const POLL_MS = 4000;
const POOL_SIZE = 50; // max simultaneously-visible arcs — keeps the view legible
const NEW_ARCS_PER_POLL = 10; // how many fresh spots from each poll get animated in
const ARC_LIFETIME_MS = 2800;
const FADE_IN_MS = 350;
const FADE_OUT_MS = 900;

// Map anchor labels — geographic reference points only, not a claim about signal
// density at that location (WSPR is a global network; see coverage_note in the UI).
const LABELS: { name: string; lat: number; lon: number }[] = [
  { name: 'N. AMERICA', lat: 45, lon: -100 },
  { name: 'EUROPE', lat: 50, lon: 12 },
  { name: 'ASIA', lat: 45, lon: 100 },
  { name: 'INDIA', lat: 22, lon: 80 },
  { name: 'AUSTRALIA', lat: -25, lon: 135 },
  { name: 'S. AMERICA', lat: -15, lon: -60 },
  { name: 'AFRICA', lat: 2, lon: 20 },
];

const MAP_W = 20; // world units, equirectangular 2:1
const MAP_H = 10;

function project(lat: number, lon: number): [number, number] {
  const x = (lon / 180) * (MAP_W / 2);
  const y = (lat / 90) * (MAP_H / 2);
  return [x, y];
}

interface ArcSlot {
  spawnedAt: number;
  active: boolean;
  txCall: string;
  rxCall: string;
}

export default function GlobalPropagationMap({ backendUrl, onClose }: { backendUrl: string; onClose?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<GlobalMapResponse | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [fps, setFps] = useState<number | null>(null);
  const seenSpots = useRef<Set<string>>(new Set());
  const pendingSpots = useRef<Spot[]>([]);

  // Poll the live endpoint. Fresh spots not seen before are queued for the render
  // loop to animate in a few at a time — this is the "sample", not the full total.
  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      fetch(`${backendUrl}/ionosphere/global-map?limit=300`)
        .then(r => (r.ok ? r.json() : Promise.reject(new Error('global-map'))))
        .then((d: GlobalMapResponse) => {
          if (cancelled || !d?.spots) return;
          setData(d);
          setSecondsAgo(0);
          const fresh = d.spots.filter(s => {
            const key = `${s.tx_call}-${s.rx_call}-${s.time}`;
            if (seenSpots.current.has(key)) return false;
            seenSpots.current.add(key);
            return true;
          });
          if (seenSpots.current.size > 3000) seenSpots.current.clear(); // bounded memory
          pendingSpots.current.push(...fresh);
        })
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [backendUrl]);

  useEffect(() => {
    const t = setInterval(() => setSecondsAgo(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [data]);

  // Three.js scene — flat equirectangular map, fixed pool of recycled arcs.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    let disposed = false;

    let THREE: typeof import('three');
    let renderer: import('three').WebGLRenderer;
    let scene: import('three').Scene;
    let camera: import('three').OrthographicCamera;
    let animId = 0;
    const arcLines: import('three').Line[] = [];
    const arcMats: import('three').LineBasicMaterial[] = [];
    const endpointPoints: import('three').Points[] = [];
    const endpointMats: import('three').PointsMaterial[] = [];
    const slots: ArcSlot[] = Array.from({ length: POOL_SIZE }, () => ({ spawnedAt: 0, active: false, txCall: '', rxCall: '' }));

    async function init() {
      THREE = await import('three');
      const w = container!.clientWidth, h = container!.clientHeight;

      // Render into the persistent <canvas> JSX element (ref), not a manually
      // appendChild'd one — Next.js dev mode double-invokes effects
      // (React StrictMode), and appendChild-ing a fresh canvas each time leaves a
      // stale, never-rendered-to canvas stacked over the live one. A ref'd canvas
      // is reused across both invocations, so there's only ever one. Matches the
      // existing SolarHeader.tsx pattern.
      renderer = new THREE.WebGLRenderer({ canvas: canvas ?? undefined, antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);

      scene = new THREE.Scene();
      const aspect = w / h;
      const viewH = MAP_H * 0.62;
      const viewW = viewH * aspect;
      camera = new THREE.OrthographicCamera(-viewW, viewW, viewH, -viewH, 0.1, 100);
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);

      // Faint graticule — meridians/parallels every 30deg, drawn once, static.
      const gridMat = new THREE.LineBasicMaterial({ color: 0x4df0ff, transparent: true, opacity: 0.08 });
      for (let lon = -180; lon <= 180; lon += 30) {
        const [x1] = project(90, lon), [x2] = project(-90, lon);
        const pts = [new THREE.Vector3(x1, MAP_H / 2, 0), new THREE.Vector3(x2, -MAP_H / 2, 0)];
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        const [, y1] = project(lat, -180), [, y2] = project(lat, 180);
        const pts = [new THREE.Vector3(-MAP_W / 2, y1, 0), new THREE.Vector3(MAP_W / 2, y2, 0)];
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
      }
      // Map border
      const borderPts = [
        new THREE.Vector3(-MAP_W / 2, -MAP_H / 2, 0), new THREE.Vector3(MAP_W / 2, -MAP_H / 2, 0),
        new THREE.Vector3(MAP_W / 2, MAP_H / 2, 0), new THREE.Vector3(-MAP_W / 2, MAP_H / 2, 0),
        new THREE.Vector3(-MAP_W / 2, -MAP_H / 2, 0),
      ];
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(borderPts),
        new THREE.LineBasicMaterial({ color: 0x4df0ff, transparent: true, opacity: 0.2 })));

      // Pre-allocate the recycled arc pool — created once, reused forever (the
      // standard fix for the "new geometry every frame" Three.js performance trap).
      for (let i = 0; i < POOL_SIZE; i++) {
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        const mat = new THREE.LineBasicMaterial({ color: 0xff2d4a, transparent: true, opacity: 0 });
        const line = new THREE.Line(geo, mat);
        scene.add(line);
        arcLines.push(line);
        arcMats.push(mat);

        const pGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        const pMat = new THREE.PointsMaterial({ color: 0x4df0ff, size: 0.14, transparent: true, opacity: 0, sizeAttenuation: true });
        const pts = new THREE.Points(pGeo, pMat);
        scene.add(pts);
        endpointPoints.push(pts);
        endpointMats.push(pMat);
      }
    }

    let frameCount = 0, fpsStart = performance.now();

    function animate() {
      if (disposed) return;
      animId = requestAnimationFrame(animate);
      const now = performance.now();

      // FPS sampling — reported once per second, used by the perf check in testing.
      // Skip counting while the tab is hidden/occluded: Chrome throttles rAF to
      // ~1Hz for a backgrounded or fully-covered window, and a frame count taken
      // across that throttled span reads as a misleading near-zero "fps" that has
      // nothing to do with real render performance. Reset the sampling window
      // instead, so the first reading after the tab is visible again reflects
      // real frame timing rather than a stale throttled one.
      if (document.hidden) {
        frameCount = 0;
        fpsStart = now;
      } else {
        frameCount++;
        if (now - fpsStart >= 1000) {
          setFps(Math.round((frameCount * 1000) / (now - fpsStart)));
          frameCount = 0;
          fpsStart = now;
        }
      }

      // Recycle expired slots and admit new pending spots into free slots.
      for (let i = 0; i < POOL_SIZE; i++) {
        const slot = slots[i];
        if (slot.active && now - slot.spawnedAt > ARC_LIFETIME_MS) slot.active = false;
      }
      let admitted = 0;
      while (admitted < NEW_ARCS_PER_POLL && pendingSpots.current.length > 0) {
        const freeIdx = slots.findIndex(s => !s.active);
        if (freeIdx === -1) break;
        const spot = pendingSpots.current.shift()!;
        const [tx1, ty1] = project(spot.tx_lat, spot.tx_lon);
        const [tx2, ty2] = project(spot.rx_lat, spot.rx_lon);
        const posAttr = arcLines[freeIdx].geometry.attributes.position as import('three').BufferAttribute;
        posAttr.setXYZ(0, tx1, ty1, 0);
        posAttr.setXYZ(1, tx2, ty2, 0);
        posAttr.needsUpdate = true;
        const pPosAttr = endpointPoints[freeIdx].geometry.attributes.position as import('three').BufferAttribute;
        pPosAttr.setXYZ(0, tx1, ty1, 0);
        pPosAttr.setXYZ(1, tx2, ty2, 0);
        pPosAttr.needsUpdate = true;
        slots[freeIdx] = { spawnedAt: now, active: true, txCall: spot.tx_call, rxCall: spot.rx_call };
        admitted++;
      }

      // Fade curve per active slot: fade in -> hold -> fade out.
      for (let i = 0; i < POOL_SIZE; i++) {
        const slot = slots[i];
        if (!slot.active) {
          arcMats[i].opacity = 0;
          endpointMats[i].opacity = 0;
          continue;
        }
        const age = now - slot.spawnedAt;
        let opacity: number;
        if (age < FADE_IN_MS) opacity = age / FADE_IN_MS;
        else if (age > ARC_LIFETIME_MS - FADE_OUT_MS) opacity = Math.max(0, (ARC_LIFETIME_MS - age) / FADE_OUT_MS);
        else opacity = 1;
        arcMats[i].opacity = opacity * 0.55;
        endpointMats[i].opacity = opacity * 0.9;
      }

      renderer.render(scene, camera);
    }

    init().then(() => { if (!disposed) animate(); });

    const onResize = () => {
      if (!renderer || !camera || !container) return;
      const w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h);
      const aspect = w / h;
      const viewH = MAP_H * 0.62;
      const viewW = viewH * aspect;
      camera.left = -viewW; camera.right = viewW; camera.top = viewH; camera.bottom = -viewH;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer?.dispose();
    };
  }, []);

  const isLive = data?.data_freshness === 'live';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: 'radial-gradient(ellipse at center, #050d18 0%, #020408 100%)' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
      </div>

      {/* Geographic reference labels — overlay, not part of the WebGL scene */}
      {LABELS.map(l => {
        const [x, y] = project(l.lat, l.lon);
        const leftPct = 50 + (x / (MAP_W / 2)) * 42;
        const topPct = 50 - (y / (MAP_H / 2)) * 42;
        return (
          <div key={l.name} style={{
            position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`, transform: 'translate(-50%,-50%)',
            fontSize: 9, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.22)',
            fontFamily: 'DM Mono, monospace', pointerEvents: 'none', whiteSpace: 'nowrap',
          }}>
            {l.name}
          </div>
        );
      })}

      {/* Header bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        background: 'linear-gradient(rgba(5,13,24,0.9), transparent)',
      }}>
        <div>
          <div style={{ fontSize: 13, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.75)', fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>
            GLOBAL PROPAGATION MAP
          </div>
          <div style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(77,240,255,0.6)', marginTop: 3 }}>
            HamSCI · WSPR amateur-radio network — real ionospheric propagation, live
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            fontSize: 10, letterSpacing: '0.1em', padding: '6px 12px', cursor: 'pointer',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.6)', borderRadius: 1, fontFamily: 'DM Mono, monospace',
          }}>
            ✕ CLOSE
          </button>
        )}
      </div>

      {/* Live status + honest sample label */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 20px',
        background: 'linear-gradient(transparent, rgba(5,13,24,0.92))',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isLive ? 'var(--aurora-green)' : 'rgba(255,255,255,0.3)',
              boxShadow: isLive ? '0 0 6px var(--aurora-green)' : 'none',
              animation: isLive ? 'pulse-danger 1.8s ease-in-out infinite' : undefined,
            }} />
            <span style={{ fontSize: 9, letterSpacing: '0.14em', fontWeight: 600, color: isLive ? 'var(--aurora-green)' : 'rgba(255,255,255,0.4)' }}>
              {isLive ? 'LIVE' : (data?.data_freshness || '—').toUpperCase()}
            </span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
              {data ? `updated ${secondsAgo}s ago` : 'connecting…'}
            </span>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', marginTop: 4, maxWidth: 560, lineHeight: 1.5 }}>
            {data
              ? `Showing a live sample — most recent ${data.sample_size} real signals refreshed every ${POLL_MS / 1000}s, out of ~${data.hourly_total?.toLocaleString() ?? '?'} global signals this hour. Not every signal is drawn at once — arcs fade in and out to stay legible.`
              : 'Loading live propagation data…'}
          </div>
        </div>
        <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5, textAlign: 'right', maxWidth: 280 }}>
          {data?.attribution}
          <br />
          {data?.coverage_note}
        </div>
      </div>

      {/* Perf readout — small, unobtrusive, placed under the header row to avoid
          colliding with the close button */}
      {fps !== null && (
        <div style={{ position: 'absolute', top: 52, right: 20, fontSize: 8, color: 'rgba(255,255,255,0.22)', fontFamily: 'DM Mono, monospace' }}>
          {fps} fps
        </div>
      )}
    </div>
  );
}
