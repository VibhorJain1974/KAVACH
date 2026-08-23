'use client';

import { useEffect, useState } from 'react';

interface LiveNow {
  kp: number;
  time?: string;
  fetched_at: string;
  data_freshness: 'live' | 'cache' | 'fixture' | 'none';
}

const POLL_MS = 30_000;

export default function LiveNowStrip({ backendUrl }: { backendUrl: string }) {
  const [data, setData] = useState<LiveNow | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      fetch(`${backendUrl}/storm/live-now`)
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`live-now ${r.status}`)))
        .then(d => { if (!cancelled && typeof d?.kp === 'number' && d?.data_freshness) { setData(d); setSecondsAgo(0); } })
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [backendUrl]);

  // Ticks every second purely so the "Xs ago" counter visibly moves —
  // proof this isn't a static/pre-recorded number.
  useEffect(() => {
    const tick = setInterval(() => setSecondsAgo(s => s + 1), 1000);
    return () => clearInterval(tick);
  }, [data]);

  if (!data) return null;

  const isLive = data.data_freshness === 'live';

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
      background: 'rgba(5,13,24,0.85)',
      borderBottom: '1px solid rgba(77,240,255,0.12)',
      padding: '6px 16px',
      display: 'flex', alignItems: 'center', gap: 8,
      backdropFilter: 'blur(8px)',
      fontFamily: 'DM Mono, monospace',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: isLive ? 'var(--aurora-green)' : 'rgba(255,255,255,0.3)',
        boxShadow: isLive ? '0 0 6px var(--aurora-green)' : 'none',
        animation: isLive ? 'pulse-danger 1.8s ease-in-out infinite' : undefined,
      }} />
      <span style={{ fontSize: 9, letterSpacing: '0.15em', color: isLive ? 'var(--aurora-green)' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
        {isLive ? 'LIVE' : data.data_freshness.toUpperCase()}
      </span>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
        This is real space weather, right now — Kp {data.kp.toFixed(1)}, unscripted
      </span>
      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>
        updated {secondsAgo}s ago
      </span>
    </div>
  );
}
