'use client';

import { useEffect, useRef, useState } from 'react';

interface FusionSignal {
  key: string;
  source: string;
  signal_type?: 'forecast' | 'witness';
  metric: string;
  value: number | null;
  threshold: number;
  crossed: boolean;
  data_freshness: 'live' | 'cache' | 'fixture' | 'none';
  killed?: boolean;
  live?: boolean;
}

interface FusionStatus {
  confidence_pct: number;
  signals_crossed: number;
  signals_total: number;
  insufficient_live_sources?: boolean;
  explainability: {
    signals: FusionSignal[];
    method_note: string;
  };
  mission_acknowledgments: { mission: string; agency: string; note: string }[];
}

const FRESHNESS_LABEL: Record<string, string> = {
  live: 'LIVE',
  cache: 'CACHED',
  fixture: 'OFFLINE FIXTURE',
  none: 'UNAVAILABLE',
};

const LOCK_STAGGER_MS = 800;

// Short rising beep per signal lock. Best-effort only — the visual sequence
// never depends on this succeeding (autoplay policies / no speakers / etc).
function playLockTone(stepIndex: number) {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 420 + stepIndex * 110;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {
    // audio is a bonus, never let it break the sequence
  }
}

export default function FusionPanel({ backendUrl, demoActive }: { backendUrl: string; demoActive?: boolean }) {
  const [status, setStatus] = useState<FusionStatus | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);
  const [revealCount, setRevealCount] = useState(0); // 0..signals.length = signals revealed, signals.length+1 = confidence revealed
  const [lockingIndex, setLockingIndex] = useState<number | null>(null);
  const wasDemoActive = useRef(false);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const revealedOnceIdle = useRef(false);
  const [killMode, setKillMode] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confChange, setConfChange] = useState<{ from: number; to: number } | null>(null);

  // "Kill the feed" — flip one source's LIVE connection in the DISPLAY layer via
  // the real fallback path, then swap in the recomputed fusion so the confidence
  // re-derives on screen. Never touches autonomous monitoring (backend-enforced).
  const toggleFeed = async (key: string, killed: boolean) => {
    if (busyKey) return;
    setBusyKey(key);
    const from = status?.confidence_pct ?? 0;
    try {
      const res = await fetch(`${backendUrl}/fusion/feed-toggle?source=${key}&killed=${killed}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data?.fusion?.explainability) {
          setStatus(data.fusion);
          setConfChange({ from, to: data.fusion.confidence_pct });
          setTimeout(() => setConfChange(null), 4500);
        }
      }
    } catch {
      // demo control — never fatal
    } finally {
      setBusyKey(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch(`${backendUrl}/fusion/status`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`fusion/status ${r.status}`)))
      .then(d => { if (!cancelled) { if (d?.explainability) setStatus(d); else setError(true); } })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [backendUrl]);

  // Idle (pre-demo) state: show fully revealed, no animation, so the panel
  // isn't blank before REPLAY STORM is ever pressed.
  useEffect(() => {
    if (status?.explainability && !demoActive && !revealedOnceIdle.current) {
      revealedOnceIdle.current = true;
      setRevealCount(status.explainability.signals.length + 1);
    }
  }, [status, demoActive]);

  // Rising edge of demoActive -> replay the signal-lock sequence from scratch.
  useEffect(() => {
    if (!status?.explainability) return;
    const justStarted = demoActive && !wasDemoActive.current;
    wasDemoActive.current = !!demoActive;
    if (!justStarted) return;

    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    setExpanded(true);
    setRevealCount(0);
    setLockingIndex(null);

    const signals = status.explainability.signals;
    signals.forEach((_, i) => {
      const t = setTimeout(() => {
        setRevealCount(i + 1);
        setLockingIndex(i);
        playLockTone(i);
        const clearLock = setTimeout(() => setLockingIndex(null), 500);
        timeouts.current.push(clearLock);
      }, (i + 1) * LOCK_STAGGER_MS);
      timeouts.current.push(t);
    });

    const confidenceDelay = (signals.length + 1) * LOCK_STAGGER_MS;
    const tConf = setTimeout(() => {
      setRevealCount(signals.length + 1);
      playLockTone(signals.length);
    }, confidenceDelay);
    timeouts.current.push(tConf);

    return () => { timeouts.current.forEach(clearTimeout); timeouts.current = []; };
  }, [demoActive, status]);

  if (error || !status?.explainability) {
    return null;
  }

  const signals = status.explainability.signals;
  const confidenceRevealed = revealCount > signals.length;

  const confidenceColor =
    status.confidence_pct >= 67 ? 'var(--aurora-red)' :
    status.confidence_pct >= 34 ? 'var(--aurora-yellow)' : 'var(--aurora-green)';

  return (
    <div className="panel" style={{ borderRadius: 0, borderTop: '1px solid rgba(77,240,255,0.08)' }}>
      <div
        style={{
          padding: '10px 16px 8px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{ fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}>
          CONSTELLATION FUSION
        </span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minHeight: 30 }}>
          {confidenceRevealed ? (
            <span
              className="animate-confidence-reveal"
              style={{
                fontSize: 22, fontWeight: 700, fontFamily: 'DM Mono, monospace',
                color: confidenceColor, textShadow: `0 0 12px ${confidenceColor}55`,
              }}
            >
              {status.confidence_pct}%
            </span>
          ) : demoActive ? (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
              LOCKING SIGNALS…
            </span>
          ) : null}
          {confidenceRevealed && (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
              {status.insufficient_live_sources
                ? 'insufficient live sources'
                : `${status.signals_crossed} of ${status.signals_total} live sources crossed threshold`}
            </span>
          )}
          {confChange && (
            <span className="animate-slide-up" style={{
              fontSize: 10, fontFamily: 'DM Mono, monospace', marginLeft: 'auto',
              color: confChange.to < confChange.from ? 'var(--aurora-red)' : 'var(--aurora-green)',
            }}>
              confidence {confChange.from}% → {confChange.to}%
            </span>
          )}
        </div>

        {expanded && confidenceRevealed && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setKillMode(k => !k)}
              style={{
                fontSize: 8, letterSpacing: '0.08em', padding: '4px 8px', cursor: 'pointer',
                background: killMode ? 'rgba(255,45,74,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${killMode ? 'rgba(255,45,74,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: killMode ? 'var(--aurora-red)' : 'rgba(255,255,255,0.45)',
                borderRadius: 1, fontFamily: 'DM Mono, monospace',
              }}
            >
              {killMode ? '✕ CLOSE KILL CONTROLS' : '⚡ KILL A LIVE FEED'}
            </button>
            {killMode && (
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>
                Break it live — the score re-derives from what survives.
              </span>
            )}
          </div>
        )}

        {expanded && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {signals.map((s, i) => {
              const revealed = i < revealCount;
              if (!revealed) {
                return (
                  <div key={s.key} style={{
                    padding: '6px 8px',
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    fontSize: 9, color: 'rgba(255,255,255,0.15)',
                  }}>
                    · · · awaiting signal
                  </div>
                );
              }
              const killed = !!s.killed;
              return (
                <div
                  key={s.key}
                  className={`animate-slide-up${lockingIndex === i ? ' animate-signal-lock' : ''}`}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6,
                    padding: '6px 8px',
                    background: killed ? 'rgba(255,255,255,0.015)' : (s.crossed ? 'rgba(255,68,68,0.05)' : 'rgba(255,255,255,0.02)'),
                    border: `1px ${killed ? 'dashed' : 'solid'} ${killed ? 'rgba(255,45,74,0.3)' : (s.crossed ? 'rgba(255,68,68,0.15)' : 'rgba(255,255,255,0.05)')}`,
                    fontSize: 9, opacity: killed ? 0.72 : 1, transition: 'opacity 0.3s, border 0.3s',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {s.source}
                      {s.signal_type === 'witness' && (
                        <span style={{ fontSize: 7, color: 'rgba(77,240,255,0.7)', marginLeft: 5, letterSpacing: '0.06em' }}>WITNESS</span>
                      )}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>
                      {s.value !== null ? s.value.toFixed(2) : 'n/a'} vs threshold {s.threshold}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 7, letterSpacing: '0.08em', whiteSpace: 'nowrap',
                      color: killed ? 'var(--aurora-red)' : (s.crossed ? 'var(--aurora-red)' : 'rgba(255,255,255,0.3)'),
                    }}>
                      {killed ? 'KILLED · ' : (s.crossed ? 'LOCKED · ' : '')}{FRESHNESS_LABEL[s.data_freshness] || s.data_freshness.toUpperCase()}
                    </span>
                    {killMode && (
                      <button
                        onClick={() => toggleFeed(s.key, !killed)}
                        disabled={busyKey === s.key}
                        style={{
                          fontSize: 7, letterSpacing: '0.06em', padding: '3px 6px',
                          cursor: busyKey === s.key ? 'wait' : 'pointer',
                          background: killed ? 'rgba(0,255,136,0.1)' : 'rgba(255,45,74,0.12)',
                          border: `1px solid ${killed ? 'rgba(0,255,136,0.35)' : 'rgba(255,45,74,0.4)'}`,
                          color: killed ? 'var(--aurora-green)' : 'var(--aurora-red)',
                          borderRadius: 1, fontFamily: 'DM Mono, monospace', flexShrink: 0,
                        }}
                      >
                        {busyKey === s.key ? '…' : (killed ? 'REVIVE' : 'KILL')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {confidenceRevealed && (
              <>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, marginTop: 2 }}>
                  {status.explainability.method_note}
                </div>

                <div style={{ marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
                  {status.mission_acknowledgments.map(m => (
                    <div key={m.mission} style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>{m.mission}</span> ({m.agency}) — mission acknowledgment, not a live feed
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
