'use client';

export default function StatusBar({
  message, severity, demoRunning,
}: {
  message: string;
  severity: string;
  demoRunning: boolean;
}) {
  const isAlert = severity === 'red';

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: isAlert ? 'rgba(20,4,8,0.92)' : 'rgba(5,13,24,0.88)',
      borderTop: `1px solid ${isAlert ? 'rgba(255,45,74,0.35)' : 'rgba(77,240,255,0.1)'}`,
      padding: '8px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      backdropFilter: 'blur(12px)',
    }}>
      {/* Status dot */}
      <div style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: demoRunning ? 'var(--aurora-red)' : isAlert ? 'var(--aurora-red)' : 'var(--aurora-green)',
        boxShadow: `0 0 6px ${isAlert ? 'var(--aurora-red)' : 'var(--aurora-green)'}`,
        animation: demoRunning || isAlert ? 'pulse-danger 1.5s ease-in-out infinite' : undefined,
      }} />

      <span style={{
        fontSize: 11,
        color: isAlert ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)',
        letterSpacing: '0.05em',
        fontFamily: 'DM Mono, monospace',
        flex: 1,
      }}>
        {message}
      </span>

      {demoRunning && (
        <span style={{ fontSize: 9, color: 'rgba(77,240,255,0.5)', letterSpacing: '0.1em' }}>
          AUTONOMOUS
        </span>
      )}

      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em' }}>
        NASA DONKI · NOAA SWPC
      </span>
    </div>
  );
}
