'use client';

import { useEffect, useState } from 'react';

const SEVERITY_CONFIG = {
  green: { label: 'ALL CLEAR', color: 'var(--aurora-green)', cls: 'glow-green' },
  yellow: { label: 'WATCH', color: 'var(--aurora-yellow)', cls: 'glow-solar' },
  red: { label: 'EXTREME STORM', color: 'var(--aurora-red)', cls: 'glow-red' },
};

export default function Header({ severity, currentKp }: { severity: 'green'|'yellow'|'red'; currentKp: number }) {
  const [time, setTime] = useState('');
  const cfg = SEVERITY_CONFIG[severity];

  useEffect(() => {
    const tick = () => setTime(new Date().toUTCString().slice(17, 25) + ' UTC');
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header style={{
      background: 'rgba(5,13,24,0.95)',
      borderBottom: `1px solid ${severity === 'red' ? 'rgba(255,45,74,0.4)' : 'rgba(77,240,255,0.1)'}`,
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      {/* Logo + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 36, height: 36,
          background: `conic-gradient(${cfg.color}, rgba(77,240,255,0.6), ${cfg.color})`,
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700,
          color: '#000',
          fontFamily: 'Syne, sans-serif',
          flexShrink: 0,
          animation: severity === 'red' ? 'pulse-danger 2s infinite' : undefined,
        }}>K</div>
        <div>
          <div className="font-display" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.08em', color: '#fff' }}>
            KAVACH
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', marginTop: 1 }}>
            AUTONOMOUS SPACE WEATHER SHIELD
          </div>
        </div>
      </div>

      {/* Center status */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 11,
          letterSpacing: '0.2em',
          color: cfg.color,
          fontWeight: 600,
        }} className={cfg.cls}>
          ● {cfg.label}
        </div>
        {currentKp > 0 && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            Kp = {currentKp.toFixed(1)}
          </div>
        )}
      </div>

      {/* Right: time + data sources */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em' }} className="font-mono">
          {time}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(77,240,255,0.5)', marginTop: 2, letterSpacing: '0.08em' }}>
          NASA DONKI · NOAA SWPC · ISRO
        </div>
      </div>
    </header>
  );
}
