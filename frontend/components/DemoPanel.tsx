'use client';

import type { DemoStep } from '@/lib/types';

const STEPS = [
  { n: 1, label: 'Normal state' },
  { n: 2, label: 'CME detected' },
  { n: 3, label: 'Data ingested' },
  { n: 4, label: 'Zones mapped' },
  { n: 5, label: 'Alerts dispatched' },
  { n: 6, label: 'Hindi call placed' },
  { n: 7, label: 'Complete' },
];

export default function DemoPanel({
  onRun, onReset, running, step, callStatus,
}: {
  onRun: () => void;
  onReset: () => void;
  running: boolean;
  step: DemoStep | null;
  callStatus: string | null;
}) {
  const currentStep = step?.step || 0;
  const isComplete = step?.status === 'complete';

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

      {/* Step progress */}
      <div style={{ marginBottom: 12 }}>
        {STEPS.map(s => {
          const done = currentStep > s.n;
          const active = currentStep === s.n;
          return (
            <div key={s.n} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 4, opacity: done || active ? 1 : 0.35,
              transition: 'opacity 0.3s ease',
            }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                background: done ? 'var(--aurora-green)' : active ? 'var(--aurora-red)' : 'rgba(255,255,255,0.1)',
                border: active ? '2px solid var(--aurora-red)' : 'none',
                boxShadow: active ? '0 0 8px var(--aurora-red)' : done ? '0 0 6px var(--aurora-green)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 7,
              }}>
                {done && <span style={{ color: '#000', fontWeight: 700 }}>✓</span>}
                {active && <span style={{ display: 'block', width: 4, height: 4, borderRadius: '50%', background: '#000' }} />}
              </div>
              <span style={{
                fontSize: 10,
                color: done ? 'var(--aurora-green)' : active ? '#fff' : 'rgba(255,255,255,0.4)',
                letterSpacing: '0.06em',
              }}>
                {s.label}
              </span>
              {active && running && <span className="animate-blink" style={{ fontSize: 9, color: 'var(--aurora-red)', marginLeft: 'auto' }}>●</span>}
            </div>
          );
        })}
      </div>

      {/* Call status */}
      {callStatus && (
        <div style={{
          fontSize: 9, color: 'var(--aurora-green)', letterSpacing: '0.06em',
          background: 'rgba(0,255,136,0.06)',
          border: '1px solid rgba(0,255,136,0.2)',
          padding: '4px 8px', marginBottom: 10, borderRadius: 1,
        }} className="animate-slide-up">
          📞 {callStatus}
        </div>
      )}

      {/* Summary */}
      {isComplete && step?.summary && (
        <div style={{
          fontSize: 9, lineHeight: 1.6,
          background: 'rgba(255,45,74,0.06)',
          border: '1px solid rgba(255,45,74,0.2)',
          padding: '6px 8px', marginBottom: 10, borderRadius: 1,
        }} className="animate-slide-up">
          <div style={{ color: 'var(--aurora-red)', fontWeight: 600, marginBottom: 3, letterSpacing: '0.1em' }}>DEMO COMPLETE</div>
          <div style={{ color: 'rgba(255,255,255,0.6)' }}>Kp={step.summary.storm_kp} · {step.summary.zones_alerted} zones</div>
          <div style={{ color: 'rgba(255,255,255,0.6)' }}>{step.summary.farmers_called} farmers called</div>
          <div style={{ color: 'var(--aurora-green)' }}>Human triggers: {step.summary.human_triggers}</div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onRun}
          disabled={running}
          style={{
            flex: 1,
            padding: '8px 0',
            background: running ? 'rgba(255,45,74,0.1)' : 'rgba(255,45,74,0.15)',
            border: `1px solid ${running ? 'rgba(255,45,74,0.3)' : 'rgba(255,45,74,0.5)'}`,
            color: running ? 'rgba(255,45,74,0.5)' : 'var(--aurora-red)',
            fontSize: 10, letterSpacing: '0.12em',
            cursor: running ? 'not-allowed' : 'pointer',
            borderRadius: 1, transition: 'all 0.2s',
            fontFamily: 'DM Mono, monospace',
          }}
        >
          {running ? '▶ RUNNING...' : '▶ REPLAY STORM'}
        </button>
        <button
          onClick={onReset}
          disabled={running}
          style={{
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 10,
            cursor: running ? 'not-allowed' : 'pointer',
            borderRadius: 1,
            fontFamily: 'DM Mono, monospace',
          }}
        >
          ↺
        </button>
      </div>
    </div>
  );
}
