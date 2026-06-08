'use client';

const KP_MAX = 9;
const TICKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function getColor(kp: number) {
  if (kp >= 7) return 'var(--aurora-red)';
  if (kp >= 5) return 'var(--aurora-yellow)';
  return 'var(--aurora-green)';
}

function getSeverityLabel(kp: number) {
  if (kp >= 9) return 'EXTREME (G5)';
  if (kp >= 8) return 'SEVERE (G4)';
  if (kp >= 7) return 'STRONG (G3)';
  if (kp >= 6) return 'MODERATE (G2)';
  if (kp >= 5) return 'MINOR (G1)';
  if (kp > 0) return 'QUIET';
  return 'NOMINAL';
}

export default function KpGauge({ value }: { value: number; severity: string }) {
  const pct = Math.min(value / KP_MAX, 1);
  const color = getColor(value);

  return (
    <div className="panel" style={{
      padding: '16px 16px 12px',
      borderBottom: '1px solid rgba(77,240,255,0.08)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}>KP-INDEX</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>NOAA REALTIME</span>
      </div>

      {/* Big number */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <span className="font-display" style={{
          fontSize: 52,
          fontWeight: 800,
          color,
          lineHeight: 1,
          display: 'block',
          transition: 'color 0.5s ease',
          filter: value >= 7 ? `drop-shadow(0 0 20px ${color})` : undefined,
        }}>
          {value.toFixed(1)}
        </span>
        <span style={{ fontSize: 10, letterSpacing: '0.15em', color, marginTop: 4, display: 'block' }}>
          {getSeverityLabel(value)}
        </span>
      </div>

      {/* Bar */}
      <div style={{
        height: 6,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 6,
      }}>
        <div style={{
          height: '100%',
          width: `${pct * 100}%`,
          background: `linear-gradient(90deg, var(--aurora-green), ${color})`,
          borderRadius: 3,
          transition: 'width 0.8s ease, background 0.5s ease',
          boxShadow: `0 0 8px ${color}`,
        }} />
      </div>

      {/* Scale ticks */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {TICKS.map(t => (
          <span key={t} style={{
            fontSize: 9,
            color: t <= value ? color : 'rgba(255,255,255,0.2)',
            fontFamily: 'DM Mono, monospace',
            transition: 'color 0.3s ease',
          }}>{t}</span>
        ))}
      </div>

      {/* Scale labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 8, color: 'var(--aurora-green)' }}>QUIET</span>
        <span style={{ fontSize: 8, color: 'var(--aurora-yellow)' }}>WATCH</span>
        <span style={{ fontSize: 8, color: 'var(--aurora-red)' }}>EXTREME</span>
      </div>
    </div>
  );
}
