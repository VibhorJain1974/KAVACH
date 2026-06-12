'use client';

import { useEffect, useRef, useState } from 'react';
import type { DiscomZone } from '@/lib/types';

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

interface TooltipState {
  x: number;
  y: number;
  zone: DiscomZone | null;
}

export default function IndiaMap({ zones }: { zones: DiscomZone[]; severity: string }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, zone: null });
  const [mapLoaded, setMapLoaded] = useState(false);

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
        center: [80.5, 22.5],
        zoom: 4.8,
        minZoom: 3.5,
        maxZoom: 10,
        attributionControl: false,
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
    if (source) {
      source.setData(buildGeoJSON(zones));
    }
  }, [zones, mapLoaded]);

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
