'use client';

import { useState } from 'react';

// All 10 languages have confirmed live Twilio TTS voices. Order matches the
// IVR menu's digit order in twilio_caller.py (1-9 then 0).
const LANGUAGES = [
  { value: 'hindi', label: 'Hindi' },
  { value: 'english', label: 'English' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'punjabi', label: 'Punjabi' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'marathi', label: 'Marathi' },
  { value: 'bengali', label: 'Bengali' },
  { value: 'gujarati', label: 'Gujarati' },
  { value: 'kannada', label: 'Kannada' },
  // Plays a spoken menu (each line in its own language) and branches on the
  // pressed digit. Live/judge calls only — the autonomous replay is unchanged.
  { value: 'choose', label: '⌨ Let them choose (all 10)' },
];

type CallState = 'idle' | 'confirming' | 'calling' | 'placed' | 'error';

export default function LiveCallPanel({ backendUrl }: { backendUrl: string }) {
  const [phone, setPhone] = useState('+91');
  const [language, setLanguage] = useState('hindi');
  const [state, setState] = useState<CallState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const phoneValid = /^\+[1-9]\d{6,14}$/.test(phone.trim());

  const requestConfirm = () => {
    if (!phoneValid) return;
    setState('confirming');
  };

  const cancelConfirm = () => setState('idle');

  const fireCall = async () => {
    setState('calling');
    setMessage(null);
    try {
      const url = `${backendUrl}/demo/trigger-call?phones=${encodeURIComponent(phone.trim())}&language=${language}&confirm=true`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) {
        setState('error');
        setMessage(data.error || data.detail || 'Call failed');
        return;
      }
      const call = data.calls?.[0];
      setState('placed');
      setMessage(call?.call_sid ? `Call placed — SID ${call.call_sid.slice(-8)} · ${call.method}` : 'Call placed');
    } catch {
      setState('error');
      setMessage('Network error — could not reach backend');
    }
  };

  return (
    <div className="panel" style={{ borderRadius: 0, borderTop: '1px solid rgba(77,240,255,0.08)', padding: '10px 16px 12px' }}>
      <div style={{ fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
        CALL A REAL PHONE
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        <input
          type="tel"
          value={phone}
          onChange={e => { setPhone(e.target.value); if (state !== 'idle') setState('idle'); }}
          placeholder="+91XXXXXXXXXX"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${phone.length > 3 && !phoneValid ? 'rgba(255,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: '#fff', fontSize: 11, padding: '7px 8px',
            fontFamily: 'DM Mono, monospace', borderRadius: 1,
          }}
        />
        <select
          value={language}
          onChange={e => { setLanguage(e.target.value); if (state !== 'idle') setState('idle'); }}
          style={{
            background: '#0a1628',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', fontSize: 11, padding: '7px 8px',
            fontFamily: 'DM Mono, monospace', borderRadius: 1,
          }}
        >
          {/* The closed box above uses a translucent background, which is fine
              over the dark panel. The native OPEN dropdown list ignores that
              transparency and renders on the browser's own (usually white)
              popup surface while still inheriting the white text color —
              invisible until hovered. Options need an explicit opaque
              background so the list itself is legible, not just the closed box. */}
          {LANGUAGES.map(l => (
            <option key={l.value} value={l.value} style={{ background: '#0a1628', color: '#fff' }}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {message && (
        <div style={{
          fontSize: 9, marginBottom: 8, padding: '5px 8px', borderRadius: 1,
          color: state === 'error' ? 'var(--aurora-red)' : 'var(--aurora-green)',
          background: state === 'error' ? 'rgba(255,68,68,0.06)' : 'rgba(0,255,136,0.06)',
          border: `1px solid ${state === 'error' ? 'rgba(255,68,68,0.2)' : 'rgba(0,255,136,0.2)'}`,
        }} className="animate-slide-up">
          {state === 'error' ? '✕ ' : '✓ '}{message}
        </div>
      )}

      {state !== 'confirming' ? (
        <button
          onClick={requestConfirm}
          disabled={!phoneValid || state === 'calling'}
          style={{
            width: '100%', padding: '9px 0',
            background: !phoneValid ? 'rgba(255,255,255,0.02)' : 'rgba(255,45,74,0.15)',
            border: `1px solid ${!phoneValid ? 'rgba(255,255,255,0.08)' : 'rgba(255,45,74,0.5)'}`,
            color: !phoneValid ? 'rgba(255,255,255,0.25)' : 'var(--aurora-red)',
            fontSize: 10, letterSpacing: '0.1em',
            cursor: !phoneValid || state === 'calling' ? 'not-allowed' : 'pointer',
            borderRadius: 1, fontFamily: 'DM Mono, monospace', transition: 'all 0.2s',
          }}
        >
          {state === 'calling' ? 'CALLING…' : '📞 CALL THIS PHONE'}
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 6 }} className="animate-slide-up">
          <button
            onClick={fireCall}
            style={{
              flex: 1, padding: '9px 0',
              background: 'rgba(255,45,74,0.25)',
              border: '1px solid var(--aurora-red)',
              color: 'var(--aurora-red)', fontWeight: 700,
              fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer',
              borderRadius: 1, fontFamily: 'DM Mono, monospace',
            }}
          >
            CALL {phone} NOW?
          </button>
          <button
            onClick={cancelConfirm}
            style={{
              padding: '9px 12px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 10, cursor: 'pointer', borderRadius: 1,
              fontFamily: 'DM Mono, monospace',
            }}
          >
            CANCEL
          </button>
        </div>
      )}
    </div>
  );
}
