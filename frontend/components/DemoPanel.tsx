'use client';

import { useEffect, useRef, useState } from 'react';
import type { DemoStep } from '@/lib/types';

const STEPS = [
  { n: 1, label: 'Normal state',       t: 0   },
  { n: 2, label: 'CME detected',       t: 3   },
  { n: 3, label: 'Data ingested',      t: 7   },
  { n: 4, label: 'Zones mapped',       t: 11  },
  { n: 5, label: 'Alerts dispatched',  t: 15  },
  { n: 6, label: 'Hindi call placed',  t: 18  },
  { n: 7, label: 'Complete',           t: 22.6 },
];
const TOTAL_SECS = 22.6;

export default function DemoPanel({
  onRun, onReset, running, step, callStatus, callSid, backendUrl,
}: {
  onRun: () => void;
  onReset: () => void;
  running: boolean;
  step: DemoStep | null;
  callStatus: string | null;
  callSid: string | null;
  backendUrl: string;
}) {
  const currentStep = step?.step || 0;
  const isComplete = step?.status === 'complete';
  const isCallStep = currentStep === 6;

  // Recording proof state
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingPolling, setRecordingPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!callSid || recordingUrl) return;
    // Start polling 10s after call placed (recording takes a moment to process)
    const startPoll = setTimeout(() => {
      setRecordingPolling(true);
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`${backendUrl}/demo/recording?call_sid=${callSid}`);
          const data = await r.json();
          if (data.ready && data.url) {
            setRecordingUrl(data.url);
            setRecordingPolling(false);
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch {}
      }, 8000);
    }, 10000);
    return () => {
      clearTimeout(startPoll);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [callSid, recordingUrl, backendUrl]);

  // Reset recording on demo reset
  useEffect(() => {
    if (!callSid) { setRecordingUrl(null); setRecordingPolling(false); }
  }, [callSid]);

  // Elapsed timer for demo timeline bar
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (running && !isComplete) {
      if (!startRef.current) startRef.current = Date.now();
      const tick = () => {
        const e = Math.min((Date.now() - (startRef.current || Date.now())) / 1000, TOTAL_SECS);
        setElapsed(e);
        if (e < TOTAL_SECS) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
    if (!running && !isComplete) {
      cancelAnimationFrame(rafRef.current);
      if (!step) { startRef.current = null; setElapsed(0); }
    }
    if (isComplete) {
      cancelAnimationFrame(rafRef.current);
      setElapsed(TOTAL_SECS);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, isComplete, step]);

  const pct = Math.min(elapsed / TOTAL_SECS, 1) * 100;

  return (
    <div className="panel" style={{
      padding: '14px 16px',
      borderBottom: '1px solid rgba(77,240,255,0.08)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}>DEMO CONTROL</span>
        <span style={{ fontSize: 9, color: 'rgba(77,240,255,0.4)' }}>MAY 2024 REPLAY</span>
      </div>

      {/* Timeline progress bar */}
      {(running || isComplete) && (
        <div style={{ marginBottom: 10 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 8, color: 'rgba(255,255,255,0.25)', marginBottom: 4,
            fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em',
          }}>
            <span>T+0s</span>
            <span style={{ color: isComplete ? 'var(--aurora-green)' : 'rgba(255,255,255,0.4)' }}>
              T+{elapsed.toFixed(1)}s
            </span>
            <span>T+22.6s</span>
          </div>
          <div style={{
            height: 4, background: 'rgba(255,255,255,0.06)',
            borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: isComplete
                ? 'linear-gradient(90deg, var(--aurora-green), var(--plasma))'
                : 'linear-gradient(90deg, var(--plasma), var(--aurora-yellow))',
              borderRadius: 2,
              transition: 'width 0.1s linear, background 0.5s ease',
              boxShadow: `0 0 8px ${isComplete ? 'var(--aurora-green)' : 'var(--plasma)'}`,
            }} />
          </div>
          {/* Step tick marks */}
          <div style={{ position: 'relative', height: 8, marginTop: 2 }}>
            {STEPS.map(s => (
              <div key={s.n} style={{
                position: 'absolute',
                left: `${(s.t / TOTAL_SECS) * 100}%`,
                transform: 'translateX(-50%)',
                width: 1, height: 6,
                background: currentStep >= s.n
                  ? 'rgba(77,240,255,0.6)'
                  : 'rgba(255,255,255,0.12)',
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Step list */}
      <div style={{ marginBottom: 10 }}>
        {STEPS.map(s => {
          const done = currentStep > s.n;
          const active = currentStep === s.n;
          const isCallMoment = s.n === 6;
          return (
            <div key={s.n} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 3, opacity: done || active ? 1 : 0.3,
              transition: 'opacity 0.3s ease',
            }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                background: done ? 'var(--aurora-green)' : active ? (isCallMoment ? 'var(--aurora-yellow)' : 'var(--aurora-red)') : 'rgba(255,255,255,0.08)',
                border: active ? `2px solid ${isCallMoment ? 'var(--aurora-yellow)' : 'var(--aurora-red)'}` : 'none',
                boxShadow: active
                  ? `0 0 10px ${isCallMoment ? 'var(--aurora-yellow)' : 'var(--aurora-red)'}`
                  : done ? '0 0 6px var(--aurora-green)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 7, transition: 'all 0.3s ease',
              }}>
                {done && <span style={{ color: '#000', fontWeight: 700 }}>✓</span>}
                {active && <span style={{ display: 'block', width: 4, height: 4, borderRadius: '50%', background: '#000' }} />}
              </div>
              <span style={{
                fontSize: 10,
                color: done ? 'var(--aurora-green)' : active ? '#fff' : 'rgba(255,255,255,0.35)',
                letterSpacing: '0.06em',
                transition: 'color 0.3s ease',
                flex: 1,
              }}>
                {s.label}
              </span>
              {active && running && (
                <span className={`animate-blink`} style={{
                  fontSize: 9,
                  color: isCallMoment ? 'var(--aurora-yellow)' : 'var(--aurora-red)',
                }}>●</span>
              )}
            </div>
          );
        })}
      </div>

      {/* CALL LIVE moment — special treatment */}
      {(isCallStep && running) && (
        <div style={{
          margin: '8px 0',
          padding: '10px 12px',
          background: 'rgba(255,210,63,0.07)',
          border: '1px solid rgba(255,210,63,0.35)',
          borderRadius: 2,
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'slide-up 0.3s ease-out',
        }}>
          <div style={{
            fontSize: 18, animation: 'phone-ring 0.6s ease-in-out infinite',
          }}>📞</div>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
              color: 'var(--aurora-yellow)',
              marginBottom: 2,
            }}>
              HINDI CALL FIRING
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,210,63,0.6)' }}>
              Twilio → +91 · Amazon Polly Aditi
            </div>
          </div>
        </div>
      )}

      {/* Call status */}
      {callStatus && (
        <div style={{
          fontSize: 9, color: 'var(--aurora-green)', letterSpacing: '0.06em',
          background: 'rgba(0,255,136,0.06)',
          border: '1px solid rgba(0,255,136,0.2)',
          padding: '4px 8px', marginBottom: 4, borderRadius: 1,
        }} className="animate-slide-up">
          ✓ {callStatus}
        </div>
      )}

      {/* Recording proof */}
      {recordingPolling && !recordingUrl && (
        <div style={{
          fontSize: 9, color: 'var(--aurora-yellow)', letterSpacing: '0.06em',
          padding: '4px 8px', marginBottom: 4,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span className="animate-blink">●</span> Recording processing...
        </div>
      )}
      {recordingUrl && (
        <div style={{
          marginBottom: 8, padding: '8px 10px',
          background: 'rgba(77,240,255,0.06)',
          border: '1px solid rgba(77,240,255,0.3)',
          borderRadius: 2,
        }} className="animate-slide-up">
          <div style={{ fontSize: 9, color: 'var(--plasma)', letterSpacing: '0.1em', marginBottom: 6 }}>
            🎙 CALL PROOF — REAL RECORDING
          </div>
          <audio controls style={{ width: '100%', height: 28, accentColor: 'var(--plasma)' }} src={recordingUrl} />
        </div>
      )}

      {/* Summary */}
      {isComplete && step?.summary && (
        <div style={{
          fontSize: 9, lineHeight: 1.7,
          background: 'rgba(255,45,74,0.06)',
          border: '1px solid rgba(255,45,74,0.2)',
          padding: '8px 10px', marginBottom: 10, borderRadius: 1,
        }} className="animate-slide-up">
          <div style={{ color: 'var(--aurora-red)', fontWeight: 600, marginBottom: 5, letterSpacing: '0.1em', fontSize: 10 }}>DEMO COMPLETE</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 1 }}>Kp={step.summary.storm_kp} · {step.summary.zones_alerted} zones</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 1 }}>{step.summary.farmers_called} farmers called</div>
          <div style={{ color: 'var(--aurora-green)', marginBottom: 5 }}>Human triggers: {step.summary.human_triggers}</div>
          {step.summary.timeline && (
            <div style={{ borderTop: '1px solid rgba(255,45,74,0.15)', paddingTop: 5, marginBottom: 5 }}>
              <div style={{ color: 'rgba(77,240,255,0.6)', letterSpacing: '0.08em', marginBottom: 3, fontSize: 8 }}>TIMELINE — MAY 10 2024</div>
              <div style={{ color: 'rgba(255,255,255,0.45)' }}>Storm onset · 17:05 UTC</div>
              <div style={{ color: 'var(--aurora-yellow)', fontWeight: 600 }}>KAVACH alert · 17:30 UTC</div>
              <div style={{ color: 'rgba(255,45,74,0.8)' }}>Peak Kp=9.0 · 00:00 UTC+1</div>
              <div style={{ color: 'var(--aurora-green)', marginTop: 2 }}>Warning window: {step.summary.timeline.warning_window_hours}h ahead</div>
            </div>
          )}
          {step.summary.damage_avoided && (
            <div style={{ borderTop: '1px solid rgba(255,45,74,0.15)', paddingTop: 5 }}>
              <div style={{ color: 'rgba(77,240,255,0.6)', letterSpacing: '0.08em', marginBottom: 3, fontSize: 8 }}>RISK COVERED</div>
              <div style={{ color: 'rgba(255,255,255,0.45)' }}>1 transformer = ₹8.3Cr + 18mo lead</div>
              <div style={{ color: 'rgba(255,45,74,0.7)' }}>Total risk: ₹3,000 Cr</div>
              <div style={{ color: 'var(--aurora-green)', fontWeight: 600 }}>KAVACH: ₹5L/mo = {step.summary.damage_avoided.roi_x} ROI</div>
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onRun}
          disabled={running}
          style={{
            flex: 1, padding: '9px 0',
            background: running ? 'rgba(255,45,74,0.08)' : 'rgba(255,45,74,0.15)',
            border: `1px solid ${running ? 'rgba(255,45,74,0.25)' : 'rgba(255,45,74,0.5)'}`,
            color: running ? 'rgba(255,45,74,0.45)' : 'var(--aurora-red)',
            fontSize: 10, letterSpacing: '0.12em',
            cursor: running ? 'not-allowed' : 'pointer',
            borderRadius: 1, transition: 'all 0.2s',
            fontFamily: 'DM Mono, monospace',
          }}
        >
          {running ? '▶ RUNNING...' : '▶ REPLAY STORM'}
        </button>
        <button
          onClick={() => { onReset(); startRef.current = null; setElapsed(0); }}
          disabled={running}
          style={{
            padding: '9px 12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 10, cursor: running ? 'not-allowed' : 'pointer',
            borderRadius: 1, fontFamily: 'DM Mono, monospace',
            transition: 'all 0.2s',
          }}
        >
          ↺
        </button>
      </div>
    </div>
  );
}
