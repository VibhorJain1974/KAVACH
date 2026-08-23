'use client';

import { useEffect, useRef, useState } from 'react';

// The ionosphere as a WITNESS, not a forecast: every other KAVACH feed is a
// government instrument predicting the storm at the source; this is tens of
// thousands of civilians' radios measuring the storm's effect on the atmosphere,
// from the ground. Live via wspr.live; historical May 2024 collapse from a fixture.
//
// HONESTY (must stay in the UI, per the HamSCI attribution rule): the METHOD is
// published citizen science by Frissell/HamSCI. KAVACH operationalized it — it
// did not discover it. The attribution string comes straight from the backend.

interface LiveWitness {
  spot_count_1h: number;
  baseline_1h: number | null;
  deficit_pct: number;
  sky_status: 'disturbed' | 'nominal';
  disturbance_threshold_pct: number;
  data_freshness: 'live' | 'cache' | 'fixture' | 'none';
  fetched_at: string;
  attribution: string;
  coverage_note: string;
}

interface May2024 {
  available: boolean;
  peak?: { hr: string; spots: number };
  trough?: { hr: string; spots: number };
  peak_trough_collapse_pct?: number;
  baseline_at_trough_hour?: number;
  trough_hour_utc?: string;
  same_hour_deficit_pct?: number;
  attribution?: string;
}

const POLL_MS = 30_000;

export default function IonosphereWitness({ backendUrl, demoActive, onExpand }: { backendUrl: string; demoActive?: boolean; onExpand?: () => void }) {
  const [live, setLive] = useState<LiveWitness | null>(null);
  const [hist, setHist] = useState<May2024 | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [fallingNum, setFallingNum] = useState<number | null>(null);
  const wasDemoActive = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Live witness — polled, mirrors the LiveNowStrip "this is real, right now" pattern.
  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      fetch(`${backendUrl}/ionosphere/live-witness`)
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(`live-witness ${r.status}`))))
        .then(d => { if (!cancelled && typeof d?.spot_count_1h === 'number') { setLive(d); setSecondsAgo(0); } })
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [backendUrl]);

  // Historical witness — loaded once, revealed at storm peak during REPLAY.
  useEffect(() => {
    let cancelled = false;
    fetch(`${backendUrl}/ionosphere/may2024`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('may2024'))))
      .then(d => { if (!cancelled && d?.available) setHist(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [backendUrl]);

  useEffect(() => {
    const t = setInterval(() => setSecondsAgo(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [live]);

  // On REPLAY start, animate the number "falling" from the pre-storm peak down to
  // the storm trough — it should feel like a signal dying, not like reading a chart.
  useEffect(() => {
    if (!hist?.peak || !hist?.trough) return;
    const justStarted = demoActive && !wasDemoActive.current;
    wasDemoActive.current = !!demoActive;
    if (!justStarted) return;

    const peak = hist.peak.spots;
    const trough = hist.trough.spots;
    const start = performance.now();
    const DURATION = 2600;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out: fast drop, slow settle
      setFallingNum(Math.round(peak - (peak - trough) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    setFallingNum(peak);
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [demoActive, hist]);

  if (!live && !hist) return null;

  const isLive = live?.data_freshness === 'live';
  const disturbed = live?.sky_status === 'disturbed';
  const freshLabel = live ? (isLive ? 'LIVE' : live.data_freshness.toUpperCase()) : '—';

  return (
    <div className="panel" style={{ borderRadius: 0, borderTop: '1px solid rgba(77,240,255,0.08)', padding: '10px 16px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}>
          IONOSPHERE WITNESS
        </span>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
          HamSCI · WSPR
        </span>
      </div>

      {/* LIVE: the sky measured from the ground, right now */}
      {live && (
        <div style={{ marginBottom: hist ? 10 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: isLive ? 'var(--aurora-green)' : 'rgba(255,255,255,0.3)',
              boxShadow: isLive ? '0 0 6px var(--aurora-green)' : 'none',
              animation: isLive ? 'pulse-danger 1.8s ease-in-out infinite' : undefined,
            }} />
            <span style={{ fontSize: 9, letterSpacing: '0.14em', fontWeight: 600, color: isLive ? 'var(--aurora-green)' : 'rgba(255,255,255,0.4)' }}>
              {freshLabel}
            </span>
            <span style={{
              fontSize: 18, fontWeight: 700, fontFamily: 'DM Mono, monospace', marginLeft: 2,
              color: disturbed ? 'var(--aurora-red)' : 'rgba(255,255,255,0.85)',
            }}>
              {live.spot_count_1h.toLocaleString()}
            </span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>spots/hr</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>{secondsAgo}s ago</span>
          </div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
            {live.baseline_1h != null
              ? <>vs ~{live.baseline_1h.toLocaleString()} same-hour baseline · {disturbed
                  ? <span style={{ color: 'var(--aurora-red)' }}>{live.deficit_pct}% below → sky disturbed</span>
                  : <span style={{ color: 'var(--aurora-green)' }}>nominal (no propagation collapse)</span>}</>
              : 'baseline unavailable'}
          </div>

          {/* The signature moment's invitation — real live signal count as its
              own copy, not decoration. Sized to match REPLAY STORM's visual
              weight rather than reading as a secondary utility toggle. */}
          {onExpand && (
            <button
              onClick={onExpand}
              style={{
                width: '100%', marginTop: 10, padding: '10px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                background: 'rgba(77,240,255,0.06)', border: '1px solid rgba(77,240,255,0.3)',
                borderRadius: 1, cursor: 'pointer', transition: 'background 0.18s, border-color 0.18s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(77,240,255,0.12)';
                e.currentTarget.style.borderColor = 'rgba(77,240,255,0.55)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(77,240,255,0.06)';
                e.currentTarget.style.borderColor = 'rgba(77,240,255,0.3)';
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--plasma)', boxShadow: '0 0 6px var(--plasma)',
                }} />
                <span style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', color: 'var(--plasma)',
                  fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.3,
                }}>
                  {live.spot_count_1h.toLocaleString()} signals worldwide
                </span>
              </span>
              <span style={{ fontSize: 9, letterSpacing: '0.08em', color: 'rgba(77,240,255,0.65)', flexShrink: 0 }}>
                ⛶ OPEN MAP
              </span>
            </button>
          )}
        </div>
      )}

      {/* HISTORICAL: the hour the sky went quiet in May 2024 (revealed during REPLAY) */}
      {hist?.peak && hist?.trough && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8,
          opacity: demoActive || fallingNum !== null ? 1 : 0.55, transition: 'opacity 0.4s',
        }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 4 }}>
            MAY 2024 G5 — REAL ARCHIVED COLLAPSE (20m band)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontFamily: 'DM Mono, monospace' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{hist.peak.spots.toLocaleString()}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>→</span>
            <span style={{
              fontSize: 22, fontWeight: 700, color: 'var(--aurora-red)',
              textShadow: '0 0 12px rgba(255,45,74,0.4)',
            }}>
              {(fallingNum ?? hist.trough.spots).toLocaleString()}
            </span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>spots/hr</span>
          </div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginTop: 4 }}>
            {hist.same_hour_deficit_pct}% below the same hour ({hist.trough_hour_utc} UTC) on normal days —
            not a nighttime dip. Independent physical evidence of the storm, measured from the ground.
            A witness, not a forecast.
          </div>
        </div>
      )}

      {/* Attribution — small but legible, never buried. Straight from the backend. */}
      <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5, marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 6 }}>
        {live?.attribution || hist?.attribution}
        {live?.coverage_note && <><br />{live.coverage_note}</>}
      </div>
    </div>
  );
}
