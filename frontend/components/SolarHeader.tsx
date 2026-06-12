'use client';

import { useEffect, useRef } from 'react';

interface SolarHeaderProps {
  stormActive: boolean;
  kp: number;
}

export default function SolarHeader({ stormActive, kp }: SolarHeaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let THREE: typeof import('three');
    let renderer: import('three').WebGLRenderer;
    let scene: import('three').Scene;
    let camera: import('three').PerspectiveCamera;
    let sun: import('three').Mesh;
    let earth: import('three').Mesh;
    let particles: import('three').Points;
    let particlePositions: Float32Array;
    let particleVelocities: Float32Array;
    const PARTICLE_COUNT = 1200;

    async function init() {
      THREE = await import('three');

      renderer = new THREE.WebGLRenderer({ canvas: canvas ?? undefined, antialias: true, alpha: true });
      renderer.setSize(canvas!.offsetWidth, canvas!.offsetHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);

      scene = new THREE.Scene();

      // Wider FOV + camera farther back → objects are smaller, ambient, not competing
      camera = new THREE.PerspectiveCamera(75, canvas!.offsetWidth / canvas!.offsetHeight, 0.1, 1000);
      camera.position.set(0.5, 0, 12);

      // ── Sun — pushed to upper-left corner ────────────────────────
      const sunGeo = new THREE.SphereGeometry(0.9, 32, 32);
      // White-hot core reads as stellar, not cartoon orange
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffaee });
      sun = new THREE.Mesh(sunGeo, sunMat);
      sun.position.set(-7, 1.0, 0);
      scene.add(sun);

      // 4-layer corona: tight bright → wide dim, additive blending
      const coronaLayers = [
        { r: 1.15, opacity: 0.42, color: 0xffee44 },
        { r: 1.55, opacity: 0.20, color: 0xff9900 },
        { r: 2.10, opacity: 0.09, color: 0xff5500 },
        { r: 3.20, opacity: 0.03, color: 0xff1100 },
      ];
      for (const layer of coronaLayers) {
        const geo = new THREE.SphereGeometry(layer.r, 32, 32);
        const mat = new THREE.MeshBasicMaterial({
          color: layer.color,
          transparent: true,
          opacity: layer.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        sun.add(new THREE.Mesh(geo, mat));
      }

      // ── Earth — lower-right corner ────────────────────────────────
      const earthGeo = new THREE.SphereGeometry(0.4, 32, 32);
      const earthMat = new THREE.MeshBasicMaterial({ color: 0x2266cc });
      earth = new THREE.Mesh(earthGeo, earthMat);
      earth.position.set(6.5, -0.8, 0);
      scene.add(earth);

      // Atmosphere glow
      const atmosGeo = new THREE.SphereGeometry(0.58, 32, 32);
      const atmosMat = new THREE.MeshBasicMaterial({
        color: 0x44aaff,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      earth.add(new THREE.Mesh(atmosGeo, atmosMat));

      // ── Starfield ─────────────────────────────────────────────────
      const starCount = 1200;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        starPositions[i * 3]     = (Math.random() - 0.5) * 42;
        starPositions[i * 3 + 1] = (Math.random() - 0.5) * 9;
        starPositions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 6;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.028,
        transparent: true,
        opacity: 0.65,
        sizeAttenuation: true,
      });
      scene.add(new THREE.Points(starGeo, starMat));

      // ── CME Particle stream ───────────────────────────────────────
      particlePositions = new Float32Array(PARTICLE_COUNT * 3);
      particleVelocities = new Float32Array(PARTICLE_COUNT);
      for (let i = 0; i < PARTICLE_COUNT; i++) resetParticle(i);

      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

      const pMat = new THREE.PointsMaterial({
        color: stormActive ? 0xff4444 : 0x00d4ff,
        size: 0.05,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      particles = new THREE.Points(pGeo, pMat);
      scene.add(particles);
    }

    function resetParticle(i: number) {
      // Spawn near sun, slight spread
      particlePositions[i * 3]     = -7 + (Math.random() - 0.5) * 0.7;
      particlePositions[i * 3 + 1] = 1.0 + (Math.random() - 0.5) * 0.9;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      const baseSpeed = 0.009 + (kp / 9) * 0.026;
      particleVelocities[i] = baseSpeed * (0.6 + Math.random() * 0.8);
    }

    function animate() {
      animRef.current = requestAnimationFrame(animate);

      sun.rotation.y += 0.002;
      earth.rotation.y += 0.004;

      const pGeo = particles.geometry;
      const positions = pGeo.attributes.position.array as Float32Array;
      const pMat = particles.material as import('three').PointsMaterial;

      pMat.color.set(stormActive ? 0xff4444 : 0x00d4ff);
      pMat.opacity = stormActive ? 0.95 : 0.75;

      // Storm: pulse first corona layer
      if (stormActive) {
        const pulse = 1 + Math.sin(Date.now() * 0.002) * 0.05;
        const corona0 = sun.children[0] as import('three').Mesh;
        corona0.scale.setScalar(pulse);
        (corona0.material as import('three').MeshBasicMaterial).opacity = 0.42 + Math.sin(Date.now() * 0.003) * 0.15;
      }

      // Earth atmosphere color reacts to storm
      const atmosMesh = earth.children[0] as import('three').Mesh;
      const atmosMat = atmosMesh.material as import('three').MeshBasicMaterial;
      if (stormActive) {
        atmosMat.color.set(0xff3300);
        atmosMat.opacity = 0.40;
      } else {
        atmosMat.color.set(0x44aaff);
        atmosMat.opacity = 0.28;
      }

      // Move particles Sun → Earth, converging on Earth's y position
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3] += particleVelocities[i];
        // Drift y toward Earth center (-0.8)
        positions[i * 3 + 1] += (-0.8 - positions[i * 3 + 1]) * 0.0012;
        positions[i * 3 + 2] *= 0.999;
        if (positions[i * 3] > 7.2) resetParticle(i);
      }
      pGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }

    init().then(() => animate());

    const onResize = () => {
      if (!canvas || !renderer || !camera) return;
      renderer.setSize(canvas!.offsetWidth, canvas!.offsetHeight);
      camera.aspect = canvas!.offsetWidth / canvas!.offsetHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
      renderer?.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {}, [stormActive, kp]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 220,
      overflow: 'hidden',
      // Warm amber bleeds in from sun-side (left), deep space in center, cold blue for earth (right)
      background: 'radial-gradient(ellipse at 8% 55%, #1c0900 0%, #040810 52%, #020510 100%)',
      borderTop: '2px solid rgba(0,212,255,0.38)',
      borderBottom: '1px solid rgba(0,212,255,0.16)',
    }}>

      {/* Subtle mission-control grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage:
          'linear-gradient(rgba(0,212,255,0.022) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(0,212,255,0.022) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />

      {/* Three.js canvas — fills the whole header */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />

      {/* Center overlay — KAVACH owns the middle, solar system is backdrop */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 10,
      }}>
        <div style={{
          fontFamily: '"Space Grotesk", "Syne", sans-serif',
          fontSize: 54,
          fontWeight: 800,
          letterSpacing: '0.32em',
          color: '#ffffff',
          textShadow:
            '0 0 28px rgba(0,212,255,0.95),' +
            '0 0 72px rgba(0,212,255,0.32),' +
            '0 2px 6px rgba(0,0,0,0.9)',
          lineHeight: 1,
          userSelect: 'none',
        }}>
          KAVACH
        </div>

        {/* Separator */}
        <div style={{
          width: 200,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.55), transparent)',
        }} />

        <div style={{
          fontSize: 11,
          letterSpacing: '0.26em',
          color: stormActive ? '#ff7755' : 'rgba(200,218,255,0.68)',
          fontFamily: '"DM Mono", "Courier New", monospace',
          transition: 'color 0.5s',
          textShadow: stormActive ? '0 0 18px rgba(255,80,40,0.85)' : 'none',
          userSelect: 'none',
        }}>
          {stormActive
            ? `SOLAR STORM ACTIVE — Kp ${kp.toFixed(1)} — INDIA GRID AT RISK`
            : 'AUTONOMOUS SPACE WEATHER SHIELD — 1.4 BILLION INDIANS PROTECTED'}
        </div>
      </div>

      {/* Bottom-left: SOL data tag */}
      <div style={{
        position: 'absolute', left: 18, bottom: 12,
        fontFamily: '"DM Mono", monospace',
        pointerEvents: 'none',
        display: 'flex', flexDirection: 'column', gap: 3,
      }}>
        <span style={{ fontSize: 8, letterSpacing: '0.22em', color: 'rgba(255,175,0,0.75)' }}>SOL</span>
        <span style={{ fontSize: 7, letterSpacing: '0.14em', color: 'rgba(255,110,0,0.42)' }}>G-CLASS STAR</span>
      </div>

      {/* Bottom-right: EARTH data tag */}
      <div style={{
        position: 'absolute', right: 18, bottom: 12,
        fontFamily: '"DM Mono", monospace',
        textAlign: 'right',
        pointerEvents: 'none',
        display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end',
      }}>
        <span style={{ fontSize: 8, letterSpacing: '0.22em', color: 'rgba(0,212,255,0.75)' }}>EARTH / INDIA</span>
        <span style={{ fontSize: 7, letterSpacing: '0.14em', color: 'rgba(0,255,136,0.48)' }}>1.496 × 10⁸ KM</span>
      </div>
    </div>
  );
}
