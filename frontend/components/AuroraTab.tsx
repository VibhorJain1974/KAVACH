'use client';

import { useEffect, useState } from 'react';

interface AuroraLocation {
  name: string;
  lat: number;
  lng: number;
  region: string;
  min_kp_required: number;
  predicted_visible: boolean;
  probability_pct: number;
  kp_at_prediction: number;
}

interface AuroraTabProps {
  kp: number;
  backendUrl: string;
}

export default function AuroraTab({ kp, backendUrl }: AuroraTabProps) {
  const [predictions, setPredictions] = useState<AuroraLocation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (kp <= 0) return;
    setLoading(true);
    fetch(`${backendUrl}/aurora/predictions?kp=${kp}`)
      .then(r => r.json())
      .then(d => setPredictions(d.predictions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [kp, backendUrl]);

  const displayPredictions: AuroraLocation[] = predictions.length > 0 ? predictions : DEMO_PREDICTIONS(kp || 5.5);
  const activeCount = displayPredictions.filter(p => p.predicted_visible).length;

  return (
    <div style={{ padding: 16, height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', color: '#00d4ff', marginBottom: 4 }}>
          AURORA PREDICTOR
        </div>
        <div style={{ fontSize: 9, color: 'rgba(224,224,255,0.4)', letterSpacing: '0.1em' }}>
          INDIA — NORTHERN LIGHTS VISIBILITY FORECAST
        </div>
      </div>

      {/* Kp status */}
      <div style={{
        padding: '10px 12px', marginBottom: 12,
        background: kp >= 6 ? 'rgba(0,255,136,0.06)' : 'rgba(224,224,255,0.04)',
        border: `1px solid ${kp >= 6 ? 'rgba(0,255,136,0.2)' : 'rgba(224,224,255,0.08)'}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'rgba(224,224,255,0.5)', letterSpacing: '0.1em' }}>CURRENT Kp INDEX</span>
          <span style={{
            fontSize: 18, fontWeight: 700,
            color: kp >= 6 ? '#00ff88' : kp >= 4 ? '#ffd23f' : '#e0e0ff',
            fontFamily: 'DM Mono, monospace',
          }}>{kp.toFixed(1)}</span>
        </div>
        <div style={{ fontSize: 9, color: kp >= 6 ? '#00ff88' : 'rgba(224,224,255,0.4)', marginTop: 4 }}>
          {kp >= 9 ? 'EXTREME — Aurora visible from Delhi' :
           kp >= 8 ? 'SEVERE — Aurora visible from Uttarakhand' :
           kp >= 7 ? 'HIGH — Aurora visible from Himachal Pradesh' :
           kp >= 6 ? 'MODERATE — Aurora visible from Ladakh' :
           'QUIET — No aurora expected in India'}
        </div>
      </div>

      {/* Active count */}
      {activeCount > 0 && (
        <div style={{
          padding: '8px 12px', marginBottom: 12,
          background: 'rgba(0,255,136,0.08)',
          border: '1px solid rgba(0,255,136,0.25)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
          <span style={{ fontSize: 9, color: '#00ff88', letterSpacing: '0.1em' }}>
            {activeCount} LOCATION{activeCount > 1 ? 'S' : ''} WITH PREDICTED AURORA TONIGHT
          </span>
        </div>
      )}

      {/* Location cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {displayPredictions.map(loc => (
          <div key={loc.name} style={{
            padding: '10px 12px',
            background: loc.predicted_visible ? 'rgba(0,255,136,0.04)' : 'rgba(224,224,255,0.02)',
            border: `1px solid ${loc.predicted_visible ? 'rgba(0,255,136,0.2)' : 'rgba(224,224,255,0.06)'}`,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Shimmer background for visible locations */}
            {loc.predicted_visible && (
              <div className="aurora-shimmer" style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(90deg, transparent, rgba(0,255,136,0.04), transparent)',
              }} />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: loc.predicted_visible ? '#00ff88' : '#e0e0ff', marginBottom: 2 }}>
                  {loc.name}
                </div>
                <div style={{ fontSize: 8, color: 'rgba(224,224,255,0.4)', letterSpacing: '0.08em' }}>
                  {loc.region} · {loc.lat.toFixed(2)}°N · Min Kp: {loc.min_kp_required}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: loc.probability_pct > 70 ? '#00ff88' : loc.probability_pct > 30 ? '#ffd23f' : 'rgba(224,224,255,0.3)',
                  fontFamily: 'DM Mono, monospace',
                }}>{loc.probability_pct}%</div>
                <div style={{ fontSize: 7, color: 'rgba(224,224,255,0.3)', letterSpacing: '0.1em' }}>PROBABILITY</div>
              </div>
            </div>

            {/* Probability bar */}
            <div style={{ marginTop: 8, height: 2, background: 'rgba(224,224,255,0.06)', borderRadius: 1 }}>
              <div style={{
                width: `${loc.probability_pct}%`, height: '100%',
                background: loc.probability_pct > 70 ? '#00ff88' : loc.probability_pct > 30 ? '#ffd23f' : 'rgba(224,224,255,0.2)',
                transition: 'width 0.8s ease',
                boxShadow: loc.probability_pct > 50 ? `0 0 6px ${loc.probability_pct > 70 ? '#00ff88' : '#ffd23f'}` : 'none',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Attribution */}
      <div style={{ marginTop: 16, padding: '8px 0', borderTop: '1px solid rgba(224,224,255,0.05)' }}>
        <div style={{ fontSize: 8, color: 'rgba(224,224,255,0.25)', letterSpacing: '0.05em' }}>
          Aurora photo credit: Dorje Angchuk, Hanle Observatory, IAO — May 2024
        </div>
        <div style={{ fontSize: 8, color: 'rgba(224,224,255,0.25)', marginTop: 2 }}>
          Kp thresholds derived from Hanle Observatory observations & geomagnetic latitude data
        </div>
      </div>

      {loading && (
        <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 8, color: 'rgba(224,224,255,0.3)' }}>
          UPDATING...
        </div>
      )}
    </div>
  );
}

function DEMO_PREDICTIONS(kp: number): AuroraLocation[] {
  const LOCATIONS = [
    { name: "Hanle, Ladakh", lat: 32.77, lng: 78.96, region: "Ladakh", min_kp_required: 6.0 },
    { name: "Pangong Tso", lat: 33.73, lng: 78.65, region: "Ladakh", min_kp_required: 6.5 },
    { name: "Spiti Valley", lat: 32.24, lng: 78.07, region: "Himachal Pradesh", min_kp_required: 7.0 },
    { name: "Rohtang Pass", lat: 32.37, lng: 77.24, region: "Himachal Pradesh", min_kp_required: 7.5 },
    { name: "Kedarnath", lat: 30.73, lng: 79.06, region: "Uttarakhand", min_kp_required: 8.0 },
    { name: "Delhi (horizon)", lat: 28.61, lng: 77.20, region: "Delhi", min_kp_required: 9.0 },
  ];
  return LOCATIONS.map(loc => {
    const visible = kp >= loc.min_kp_required;
    const excess = kp - (loc.min_kp_required - 1.0);
    const probability = Math.max(0, Math.min(100, Math.round(excess * 50)));
    return { ...loc, predicted_visible: visible, probability_pct: probability, kp_at_prediction: kp };
  });
}
