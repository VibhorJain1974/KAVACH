'use client';

import type { AlertEvent } from '@/lib/types';

const TYPE_COLORS: Record<string, string> = {
  DISCOM: 'var(--aurora-red)',
  farmer: 'var(--aurora-orange)',
  fisherman: 'var(--plasma)',
  demo: 'var(--aurora-yellow)',
  recovery: 'var(--solar)',
};

const TYPE_ICONS: Record<string, string> = {
  DISCOM: '⚡',
  farmer: '🌾',
  fisherman: '⚓',
  demo: '📡',
  recovery: '⚠',
};

export default function AlertFeed({ alerts }: { alerts: AlertEvent[] }) {
  return (
    <div className="panel" style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderTop: 'none',
      borderRadius: 0,
    }}>
      <div style={{
        padding: '10px 16px 8px',
        borderBottom: '1px solid rgba(77,240,255,0.08)',
        flexShrink: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}>ALERT LOG</span>
        <span style={{ fontSize: 9, color: 'rgba(77,240,255,0.4)' }}>{alerts.length} events</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {alerts.length === 0 ? (
          <div style={{
            padding: '20px 16px', textAlign: 'center',
            color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: '0.08em',
          }}>
            No alerts — monitoring nominal<br />
            <span style={{ fontSize: 8, marginTop: 4, display: 'block' }}>Press REPLAY STORM to simulate</span>
          </div>
        ) : (
          alerts.map((alert, i) => {
            const type = alert.type || 'demo';
            const color = TYPE_COLORS[type] || 'rgba(255,255,255,0.5)';
            const icon = TYPE_ICONS[type] || '●';
            return (
              <div
                key={`${alert.id}-${i}`}
                className="animate-slide-up"
                style={{
                  padding: '7px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  animationDelay: `${i * 0.05}s`,
                  opacity: 0,
                  animationFillMode: 'forwards',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 11 }}>{icon}</span>
                  <span style={{ fontSize: 9, color, letterSpacing: '0.08em', fontWeight: 600 }}>
                    {type.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>
                    {alert.time || new Date(alert.timestamp).toISOString().slice(11, 19)}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', paddingLeft: 19 }}>
                  {alert.zone || alert.region || alert.message || '—'}
                  {alert.count && <span style={{ color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>{alert.count}</span>}
                </div>
                <div style={{ paddingLeft: 19, marginTop: 2 }}>
                  <span style={{
                    fontSize: 8, letterSpacing: '0.1em',
                    color: alert.status === 'notified' || alert.status === 'called' || alert.status === 'recovered' ? 'var(--aurora-green)' : 'var(--aurora-yellow)',
                  }}>
                    {alert.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
