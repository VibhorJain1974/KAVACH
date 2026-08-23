'use client';

import { useEffect, useRef, useState } from 'react';
import type { DiscomZone } from '@/lib/types';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const RISK_COLORS: Record<string, string> = {
  green: '#00ff88',
  yellow: '#ffd23f',
  orange: '#ff6b35',
  red: '#ff2d4a',
};

const RISK_OPACITY: Record<string, number> = {
  green: 0.08,
  yellow: 0.25,
  orange: 0.35,
  red: 0.5,
};

interface AuroraMarker {
  name: string;
  lat: number;
  lng: number;
  probability_pct: number;
  predicted_visible: boolean;
}

interface TooltipState {
  x: number;
  y: number;
  zone: DiscomZone | null;
}

interface InsatImagery {
  available: boolean;
  satellite?: string;
  product?: string;
  time_utc?: string;
  image_url?: string;
  bounds?: [number, number][];
  legend?: string;
  attribution?: string;
}

export default function IndiaMap({ zones, auroraMarkers = [], backendUrl }: { zones: DiscomZone[]; severity: string; auroraMarkers?: AuroraMarker[]; backendUrl?: string }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, zone: null });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [insat, setInsat] = useState<InsatImagery | null>(null);
  const [insatOn, setInsatOn] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    if (!MAPBOX_TOKEN) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;

    import('mapbox-gl').then(({ default: mapboxgl }) => {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        projection: 'mercator',  // flat India map; also lets the INSAT image overlay composite reliably
        center: [80.5, 22.5],
        zoom: 4.8,
        minZoom: 3.5,
        maxZoom: 10,
        attributionControl: false,
      });

      // Fit tightly to India on load
      map.on('style.load', () => {
        map.fitBounds([[68.0, 7.5], [97.5, 37.0]], { padding: 32, maxZoom: 5.5, duration: 0 });
      });

      map.on('load', () => {
        // Add DISCOM zone circles as a GeoJSON source
        map.addSource('discoms', {
          type: 'geojson',
          data: buildGeoJSON([]),
        });

        map.addLayer({
          id: 'discom-fill',
          type: 'circle',
          source: 'discoms',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 18, 6, 32, 8, 48],
            'circle-color': ['get', 'color'],
            'circle-opacity': ['get', 'opacity'],
            'circle-blur': 0.6,
          },
        });

        map.addLayer({
          id: 'discom-border',
          type: 'circle',
          source: 'discoms',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 20, 6, 35, 8, 52],
            'circle-color': ['get', 'color'],
            'circle-opacity': ['get', 'borderOpacity'],
            'circle-blur': 0,
          },
        });

        map.addLayer({
          id: 'discom-center',
          type: 'circle',
          source: 'discoms',
          paint: {
            'circle-radius': 3,
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.9,
          },
        });

        // Tooltip on hover
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on('mouseenter', 'discom-fill', (e: any) => {
          map.getCanvas().style.cursor = 'crosshair';
          const props = e.features?.[0]?.properties;
          if (props) {
            setTooltip({
              x: e.point.x,
              y: e.point.y,
              zone: {
                id: props.id,
                name: props.name,
                state: props.state,
                region: props.region,
                lat: props.lat,
                lng: props.lng,
                risk_level: props.risk_level,
                risk_label: props.risk_label,
                affected: props.affected === 'true' || props.affected === true,
                max_kp: props.max_kp,
              },
            });
          }
        });

        map.on('mouseleave', 'discom-fill', () => {
          map.getCanvas().style.cursor = '';
          setTooltip(t => ({ ...t, zone: null }));
        });

        // Aurora prediction markers source
        map.addSource('aurora-markers', {
          type: 'geojson',
          data: buildAuroraGeoJSON([]),
        });

        // Glow ring
        map.addLayer({
          id: 'aurora-glow',
          type: 'circle',
          source: 'aurora-markers',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 22, 6, 38],
            'circle-color': ['get', 'color'],
            'circle-opacity': ['get', 'glowOpacity'],
            'circle-blur': 0.8,
          },
        });

        // Solid dot
        map.addLayer({
          id: 'aurora-dot',
          type: 'circle',
          source: 'aurora-markers',
          paint: {
            'circle-radius': 5,
            'circle-color': ['get', 'color'],
            'circle-opacity': ['get', 'dotOpacity'],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': ['get', 'color'],
            'circle-stroke-opacity': 0.9,
          },
        });

        // Probability label
        map.addLayer({
          id: 'aurora-label',
          type: 'symbol',
          source: 'aurora-markers',
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 9,
            'text-offset': [0, 1.4],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': ['get', 'color'],
            'text-halo-color': 'rgba(0,0,0,0.8)',
            'text-halo-width': 1,
          },
        });

        mapRef.current = map;
        setMapLoaded(true);
      });
    });

    return () => { if (map) map.remove(); };
  }, []);

  // Update zones data when props change
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || zones.length === 0) return;
    const source = mapRef.current.getSource('discoms');
    if (source) source.setData(buildGeoJSON(zones));
  }, [zones, mapLoaded]);

  // Update aurora markers when prop changes
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const source = mapRef.current.getSource('aurora-markers');
    if (source) source.setData(buildAuroraGeoJSON(auroraMarkers));
  }, [auroraMarkers, mapLoaded]);

  // Fetch the latest INSAT-3S scene descriptor (real MOSDAC ncWMS). Fallback-safe:
  // available:false just means the overlay stays hidden; the map is unaffected.
  // image_url is a path on OUR backend (proxied — see routers/imagery.py), not a
  // direct MOSDAC URL: verified live that MOSDAC only sends CORS headers for
  // localhost/its own origin, which silently blocks Mapbox's WebGL texture upload
  // from a real deployed site even though the plain HTTP fetch succeeds.
  useEffect(() => {
    if (!backendUrl) return;
    let cancelled = false;
    fetch(`${backendUrl}/imagery/insat-latest`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('insat'))))
      .then(d => {
        if (!cancelled && d?.available && d.image_url && d.bounds) {
          setInsat({ ...d, image_url: `${backendUrl}${d.image_url}` });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [backendUrl]);

  // Add the INSAT scene as a single georeferenced `image` source, tucked UNDER the
  // DISCOM circles so the grid stays readable. An image source (vs per-tile WMS) is
  // projection-agnostic and renders reliably under mapbox-gl v3's globe default.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapLoaded || !map || !insat?.image_url || !insat?.bounds || map.getSource('insat')) return;
    map.addSource('insat', { type: 'image', url: insat.image_url, coordinates: insat.bounds });
    map.addLayer({
      id: 'insat-raster',
      type: 'raster',
      source: 'insat',
      layout: { visibility: insatOn ? 'visible' : 'none' },
      paint: { 'raster-opacity': 0.72, 'raster-fade-duration': 300 },
    }, 'discom-fill');
  }, [insat, mapLoaded, insatOn]);

  // Toggle overlay visibility.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer?.('insat-raster')) return;
    map.setLayoutProperty('insat-raster', 'visibility', insatOn ? 'visible' : 'none');
  }, [insatOn]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Overlay gradient edges for depth */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(2,4,8,0.7) 100%)',
      }} />

      {/* Top-left: India label */}
      <div style={{
        position: 'absolute', top: 16, left: 16,
        fontSize: 10, letterSpacing: '0.2em',
        color: 'rgba(77,240,255,0.5)',
        fontFamily: 'DM Mono, monospace',
      }}>
        INDIA — 28 DISCOM ZONES
      </div>

      {/* INSAT-3S imagery toggle — real MOSDAC near-real-time layer */}
      {insat?.available && (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 6, textAlign: 'right' }}>
          <button
            onClick={() => setInsatOn(v => !v)}
            style={{
              fontSize: 9, letterSpacing: '0.1em', padding: '6px 10px', cursor: 'pointer',
              background: insatOn ? 'rgba(255,45,74,0.15)' : 'rgba(5,13,24,0.8)',
              border: `1px solid ${insatOn ? 'rgba(255,45,74,0.5)' : 'rgba(77,240,255,0.2)'}`,
              color: insatOn ? 'var(--aurora-red)' : 'rgba(77,240,255,0.7)',
              fontFamily: 'DM Mono, monospace', backdropFilter: 'blur(8px)',
            }}
          >
            {insatOn ? '● INSAT-3S CLOUDS' : '○ INSAT-3S CLOUDS'}
          </button>
          {insatOn && (
            <div style={{
              marginTop: 6, maxWidth: 230, padding: '6px 9px',
              background: 'rgba(5,13,24,0.82)', border: '1px solid rgba(77,240,255,0.12)',
              backdropFilter: 'blur(8px)', textAlign: 'left',
            }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', fontFamily: 'DM Mono, monospace' }}>
                {insat.product} · {insat.time_utc?.replace('T', ' ').replace('Z', ' UTC')}
              </div>
              <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.4)', marginTop: 3, lineHeight: 1.5 }}>
                {insat.legend}
              </div>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', marginTop: 3, lineHeight: 1.4 }}>
                {insat.attribution}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 48, left: 16,
        background: 'rgba(5,13,24,0.8)',
        border: '1px solid rgba(77,240,255,0.1)',
        padding: '8px 12px',
        backdropFilter: 'blur(8px)',
      }}>
        {[
          { label: 'NOMINAL', color: '#00ff88' },
          { label: 'WATCH', color: '#ffd23f' },
          { label: 'HIGH RISK', color: '#ff6b35' },
          { label: 'CRITICAL', color: '#ff2d4a' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 4px ${color}` }} />
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Zone tooltip */}
      {tooltip.zone && (
        <div style={{
          position: 'absolute',
          left: tooltip.x + 12,
          top: tooltip.y - 20,
          background: 'rgba(5,13,24,0.95)',
          border: `1px solid ${RISK_COLORS[tooltip.zone.risk_level] || '#4df0ff'}`,
          padding: '8px 12px',
          pointerEvents: 'none',
          minWidth: 180,
          backdropFilter: 'blur(16px)',
          zIndex: 10,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#fff', letterSpacing: '0.06em', marginBottom: 4 }}>
            {tooltip.zone.id}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>
            {tooltip.zone.name}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
            {tooltip.zone.state} · {tooltip.zone.region.toUpperCase()}
          </div>
          <div style={{
            fontSize: 9, color: RISK_COLORS[tooltip.zone.risk_level] || '#4df0ff',
            letterSpacing: '0.1em',
          }}>
            {tooltip.zone.risk_label?.toUpperCase() || 'NOMINAL'}
            {tooltip.zone.max_kp && tooltip.zone.max_kp > 0
              ? ` · Kp ${tooltip.zone.max_kp.toFixed(1)}`
              : ''}
          </div>
        </div>
      )}

      {/* No Mapbox token warning */}
      {!MAPBOX_TOKEN && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 8,
          background: 'rgba(5,13,24,0.95)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--aurora-yellow)', letterSpacing: '0.1em' }}>
            MAPBOX TOKEN NOT SET
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local
          </div>
        </div>
      )}
    </div>
  );
}

function buildAuroraGeoJSON(markers: AuroraMarker[]) {
  return {
    type: 'FeatureCollection' as const,
    features: markers.map(m => {
      const visible = m.predicted_visible;
      const color = visible ? '#00ff88' : m.probability_pct > 0 ? '#4df0ff' : 'rgba(100,120,160,0.6)';
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
        properties: {
          label: `${m.name}\n${m.probability_pct}%`,
          color,
          glowOpacity: visible ? 0.35 : m.probability_pct > 0 ? 0.15 : 0.05,
          dotOpacity: visible ? 0.95 : m.probability_pct > 0 ? 0.55 : 0.2,
        },
      };
    }),
  };
}

function buildGeoJSON(zones: DiscomZone[]) {
  return {
    type: 'FeatureCollection' as const,
    features: zones.map(z => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [z.lng, z.lat] },
      properties: {
        id: z.id,
        name: z.name,
        state: z.state,
        region: z.region,
        lat: z.lat,
        lng: z.lng,
        risk_level: z.risk_level || 'green',
        risk_label: z.risk_label || 'none',
        affected: z.affected,
        max_kp: z.max_kp || 0,
        color: RISK_COLORS[z.risk_level || 'green'],
        opacity: RISK_OPACITY[z.risk_level || 'green'],
        borderOpacity: (RISK_OPACITY[z.risk_level || 'green'] || 0.08) * 0.4,
      },
    })),
  };
}
