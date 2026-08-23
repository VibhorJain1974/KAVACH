'use client';

import { useEffect, useState, useCallback } from 'react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface Zone { id: string; name: string; state: string; region: string; }
interface ZoneDetail {
  discom: { id: string; name: string; state: string; region: string; default_language: string };
  current: { kp: number; severity: string; affected: boolean; risk_level: string; data_freshness: string };
  alert_history: Record<string, unknown>[];
  farmer_replies: Record<string, unknown>[];
  history_scope: string;
  history_note: string;
  db_state: string;
}
interface Escalation {
  id: string;
  phone_masked: string;
  language: string;
  category: string | null;
  request_note: string;
  status: 'open' | 'acknowledged' | 'called_back';
  created_at: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  called_back_at: string | null;
}
interface Metrics {
  open_escalations: number;
  total_reached: number;
  press1_confirm_rate_pct: number | null;
  median_ack_time_seconds: number | null;
  db_state: string;
}
interface ChannelStat { count: number; pct: number; of_replies?: number; of_calls?: number; }
interface ChannelOutcomes {
  voice_confirmed: ChannelStat;
  help_requested: ChannelStat;
  sms_fallback_fired: ChannelStat;
  whatsapp_sent: ChannelStat;
  db_state: string;
}
interface RosterEntry { name: string; role: string; status: string; }

const SEV_COLOR: Record<string, string> = {
  red: 'var(--aurora-red)',
  yellow: 'var(--solar)',
  green: 'var(--aurora-green)',
};

const CATEGORY_LABEL: Record<string, string> = {
  equipment: 'EQUIPMENT',
  at_sea: 'AT SEA',
  other: 'OTHER',
};
const CATEGORY_COLOR: Record<string, string> = {
  equipment: 'var(--solar)',
  at_sea: '#ff6b35',
  other: 'var(--plasma)',
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!isFinite(ms) || ms < 0) return '—';
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${(seconds / 60).toFixed(1)}m`;
}

export default function OperatorPortal() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState('');
  const [key, setKey] = useState('');
  const [data, setData] = useState<ZoneDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [channels, setChannels] = useState<ChannelOutcomes | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [escError, setEscError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BACKEND}/operator/zones`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then(d => { if (Array.isArray(d)) { setZones(d); setZoneId(d[0]?.id ?? ''); } })
      .catch(() => setError('Could not reach backend'));
  }, []);

  const refreshEscalations = useCallback(async () => {
    if (!key) return;
    try {
      const headers = { 'x-operator-key': key };
      const [eR, mR, cR, rR] = await Promise.all([
        fetch(`${BACKEND}/operator/escalations`, { headers }),
        fetch(`${BACKEND}/operator/metrics`, { headers }),
        fetch(`${BACKEND}/operator/channel-outcomes`, { headers }),
        fetch(`${BACKEND}/operator/roster`, { headers }),
      ]);
      if (eR.ok) setEscalations(await eR.json());
      if (mR.ok) setMetrics(await mR.json());
      if (cR.ok) setChannels(await cR.json());
      if (rR.ok) setRoster((await rR.json()).roster ?? []);
      setEscError(null);
    } catch {
      setEscError('Could not reach backend for escalation data');
    }
  }, [key]);

  useEffect(() => {
    if (!data) return;
    refreshEscalations();
    const t = setInterval(refreshEscalations, 15000);
    return () => clearInterval(t);
  }, [data, refreshEscalations]);

  const signIn = async () => {
    if (!zoneId || !key) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${BACKEND}/operator/zone/${zoneId}`, { headers: { 'x-operator-key': key } });
      const d = await r.json();
      if (!r.ok) { setError(d.detail || 'Sign-in failed'); setData(null); }
      else setData(d);
    } catch {
      setError('Could not reach backend');
    } finally {
      setLoading(false);
    }
  };

  const ack = async (id: string) => {
    setBusyId(id);
    try {
      const r = await fetch(`${BACKEND}/operator/escalations/${id}/ack`, {
        method: 'POST',
        headers: { 'x-operator-key': key, 'content-type': 'application/json' },
        body: JSON.stringify({ zone: zoneId }),
      });
      if (r.ok) await refreshEscalations();
      else setEscError((await r.json()).detail || 'Could not acknowledge');
    } catch {
      setEscError('Could not reach backend');
    } finally {
      setBusyId(null);
    }
  };

  const callBack = async (id: string) => {
    setBusyId(id);
    try {
      const r = await fetch(`${BACKEND}/operator/escalations/${id}/callback`, {
        method: 'POST',
        headers: { 'x-operator-key': key },
      });
      const d = await r.json();
      if (r.ok) await refreshEscalations();
      else setEscError(d.detail || 'Call back failed');
    } catch {
      setEscError('Could not reach backend');
    } finally {
      setBusyId(null);
    }
  };

  const label = { fontSize: 9, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' } as const;
  const input = {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(77,240,255,0.15)',
    color: '#fff', padding: '7px 9px', fontSize: 11, fontFamily: 'DM Mono, monospace', width: '100%',
  } as const;
  const btn = {
    fontFamily: 'Space Grotesk, sans-serif', fontSize: 9, fontWeight: 600, letterSpacing: '0.08em',
    padding: '7px 11px', borderRadius: 2, cursor: 'pointer', minHeight: 30,
  } as const;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--void, #050d18)', padding: '28px 20px', fontFamily: 'DM Mono, monospace' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--plasma)' }}>KAVACH</span>
          <span style={{ ...label }}>DISCOM OPERATOR PORTAL · HUMAN-IN-THE-LOOP ESCALATION CONSOLE</span>
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>
          Demo-scoped access — single shared operator key, not production authentication.
        </div>

        {!data && (
          <div className="panel" style={{ padding: 16, maxWidth: 420 }}>
            <div style={{ ...label, marginBottom: 8 }}>SIGN IN</div>
            <div style={{ marginBottom: 8 }}>
              <select value={zoneId} onChange={e => setZoneId(e.target.value)} style={input}>
                {zones.map(z => <option key={z.id} value={z.id}>{z.id} — {z.state}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <input
                type="password" value={key} placeholder="operator key"
                onChange={e => setKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && signIn()}
                style={input}
              />
            </div>
            <button
              onClick={signIn} disabled={!zoneId || !key || loading}
              style={{
                ...input, cursor: 'pointer', textAlign: 'center',
                borderColor: 'var(--plasma)', color: 'var(--plasma)',
                opacity: (!zoneId || !key || loading) ? 0.4 : 1,
              }}
            >
              {loading ? 'CHECKING…' : 'ENTER PORTAL'}
            </button>
            {error && <div style={{ marginTop: 8, fontSize: 10, color: 'var(--aurora-red)' }}>{error}</div>}
          </div>
        )}

        {data && (
          <>
            <div className="panel" style={{ padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 15, color: '#fff' }}>{data.discom.name}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
                    {data.discom.id} · {data.discom.state} · {data.discom.region.toUpperCase()} · alerts in{' '}
                    <span style={{ color: 'var(--plasma)' }}>{data.discom.default_language}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: SEV_COLOR[data.current.severity] || '#fff' }}>
                    Kp {data.current.kp.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
                    {data.current.affected ? 'ZONE AFFECTED' : 'ZONE NOMINAL'} · {data.current.data_freshness.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* Real metrics — computed server-side from escalation_queue + alert_log, never hardcoded */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1,
              background: 'rgba(77,240,255,0.12)', border: '1px solid rgba(77,240,255,0.12)', marginBottom: 14,
            }}>
              {[
                { v: metrics ? String(metrics.open_escalations) : '—', l: ['OPEN', 'ESCALATIONS'], c: 'var(--solar)' },
                { v: metrics ? String(metrics.total_reached) : '—', l: ['REACHED', '(ANSWERED CALLS)'], c: 'var(--plasma)' },
                { v: metrics?.press1_confirm_rate_pct != null ? `${metrics.press1_confirm_rate_pct}%` : '—', l: ['PRESS-1', 'CONFIRMED'], c: 'var(--aurora-green)' },
                { v: formatDuration(metrics?.median_ack_time_seconds ?? null), l: ['MEDIAN', 'ACK TIME'], c: 'var(--plasma)' },
              ].map((m, i) => (
                <div key={i} style={{ background: 'rgba(5,13,24,0.82)', padding: '16px 14px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 800, color: m.c }}>{m.v}</div>
                  <div style={{ fontSize: 8, letterSpacing: '0.13em', color: 'rgba(200,218,255,0.45)', marginTop: 8, lineHeight: 1.4 }}>
                    {m.l.map((line, li) => <div key={li}>{line}</div>)}
                  </div>
                </div>
              ))}
            </div>

            {escError && <div style={{ marginBottom: 10, fontSize: 10, color: 'var(--aurora-red)' }}>{escError}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid rgba(77,240,255,0.12)' }}>
                  <span style={{ fontSize: 11, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.6)' }}>ESCALATION QUEUE</span>
                  <span style={{ fontSize: 9, color: 'rgba(77,240,255,0.55)' }}>
                    {escalations.filter(e => e.status === 'open').length} OPEN · press-2 from IVR
                  </span>
                </div>
                {escalations.length === 0 && (
                  <div style={{ padding: 16, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>No escalations recorded yet.</div>
                )}
                {escalations.map(e => {
                  const done = e.status !== 'open';
                  const tag = e.category ? CATEGORY_LABEL[e.category] : 'UNSPECIFIED';
                  const tagc = e.category ? CATEGORY_COLOR[e.category] : 'rgba(200,218,255,0.4)';
                  return (
                    <div key={e.id} style={{
                      display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14, alignItems: 'center',
                      padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: done ? 0.55 : 1,
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: e.status === 'open' ? 'var(--aurora-red)' : 'var(--aurora-green)',
                        boxShadow: `0 0 6px ${e.status === 'open' ? 'var(--aurora-red)' : 'var(--aurora-green)'}`,
                      }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, fontWeight: 600, color: '#fff', display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'center' }}>
                          {e.phone_masked}
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7.5, letterSpacing: '0.1em', padding: '2px 7px', borderRadius: 1, color: tagc, border: `1px solid ${tagc}` }}>{tag}</span>
                        </div>
                        <div style={{ fontSize: 9.5, color: 'rgba(200,218,255,0.45)', marginTop: 4 }}>
                          {e.language} · {timeAgo(e.created_at)}
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255,210,120,0.8)', marginTop: 5 }}>{e.request_note}</div>
                      </div>
                      {done ? (
                        <span style={{ fontSize: 9, letterSpacing: '0.06em', color: 'var(--aurora-green)', whiteSpace: 'nowrap' }}>
                          ✓ {e.status === 'called_back' ? 'CALLED BACK' : `ACK · ${e.acknowledged_by ?? ''}`}
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                          <button
                            onClick={() => callBack(e.id)} disabled={busyId === e.id}
                            style={{ ...btn, background: 'rgba(77,240,255,0.08)', border: '1px solid rgba(77,240,255,0.35)', color: 'var(--plasma)', opacity: busyId === e.id ? 0.5 : 1 }}
                          >{busyId === e.id ? '…' : 'CALL BACK'}</button>
                          <button
                            onClick={() => ack(e.id)} disabled={busyId === e.id}
                            style={{ ...btn, background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.4)', color: 'var(--aurora-green)', opacity: busyId === e.id ? 0.5 : 1 }}
                          >{busyId === e.id ? '…' : 'ACK'}</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid rgba(77,240,255,0.12)' }}>
                    <span style={{ fontSize: 11, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.6)' }}>CHANNEL OUTCOMES</span>
                    <span style={{ fontSize: 9, color: 'rgba(77,240,255,0.55)' }}>ALL TIME</span>
                  </div>
                  {channels ? [
                    { ic: '☎', t: 'Voice call · confirmed (press 1)', s: `${channels.voice_confirmed.count} of ${channels.voice_confirmed.of_replies ?? 0} replies`, pct: channels.voice_confirmed.pct, c: 'var(--aurora-green)' },
                    { ic: '◈', t: 'Help requested (press 2)', s: `${channels.help_requested.count} of ${channels.help_requested.of_replies ?? 0} replies`, pct: channels.help_requested.pct, c: 'var(--solar)' },
                    { ic: '✉', t: 'SMS fallback', s: `${channels.sms_fallback_fired.count} of ${channels.sms_fallback_fired.of_calls ?? 0} calls`, pct: channels.sms_fallback_fired.pct, c: 'var(--plasma)' },
                    { ic: '◉', t: 'WhatsApp sent', s: `${channels.whatsapp_sent.count} of ${channels.whatsapp_sent.of_calls ?? 0} calls`, pct: channels.whatsapp_sent.pct, c: 'var(--aurora-green)' },
                  ].map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, border: '1px solid rgba(77,240,255,0.12)', color: c.c }}>{c.ic}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{c.t}</div>
                        <div style={{ fontSize: 9, color: 'rgba(200,218,255,0.4)', marginTop: 3 }}>{c.s}</div>
                      </div>
                      <div style={{ width: 64, height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                        <span style={{ display: 'block', height: '100%', borderRadius: 3, width: `${Math.min(c.pct, 100)}%`, background: c.c, boxShadow: `0 0 6px ${c.c}` }} />
                      </div>
                      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, fontWeight: 700, minWidth: 44, textAlign: 'right', color: c.c }}>{c.pct}%</div>
                    </div>
                  )) : <div style={{ padding: 16, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Loading…</div>}
                </div>

                <div className="panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid rgba(77,240,255,0.12)' }}>
                    <span style={{ fontSize: 11, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.6)' }}>ON-CALL ROSTER</span>
                    <span style={{ fontSize: 9, color: 'rgba(77,240,255,0.55)' }}>STATIC · CONFIGURED</span>
                  </div>
                  {roster.length === 0 && (
                    <div style={{ padding: 16, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                      No roster configured — set OPERATOR_ROSTER in the backend .env.
                    </div>
                  )}
                  {roster.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#0a2a3e,#123b52)',
                        border: '1px solid rgba(77,240,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Space Grotesk, sans-serif', fontSize: 11, fontWeight: 700, color: 'var(--plasma)', flexShrink: 0,
                      }}>{r.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{r.name}</div>
                        <div style={{ fontSize: 9, color: 'rgba(200,218,255,0.42)', marginTop: 2 }}>{r.role}</div>
                      </div>
                      <span style={{
                        fontSize: 8, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 1,
                        color: r.status === 'ON-CALL' ? 'var(--aurora-green)' : 'rgba(200,218,255,0.4)',
                        border: `1px solid ${r.status === 'ON-CALL' ? 'rgba(0,255,136,0.4)' : 'rgba(200,218,255,0.15)'}`,
                      }}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
              <div className="panel" style={{ padding: 14 }}>
                <div style={{ ...label, marginBottom: 8 }}>ALERT HISTORY ({data.alert_history.length})</div>
                {data.db_state !== 'ok' && (
                  <div style={{ fontSize: 10, color: 'var(--solar)' }}>Alert database unavailable — no history to show.</div>
                )}
                {data.db_state === 'ok' && data.alert_history.length === 0 && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>No alerts logged yet.</div>
                )}
                {data.alert_history.map((r, i) => {
                  const st = String(r.call_status ?? '');
                  const incomplete = st === 'delivery_incomplete';
                  const recovered = st.startsWith('sms_backup_') && String(r.message ?? '').includes('delivery_incomplete');
                  return (
                    <div key={i} style={{
                      padding: incomplete || recovered ? '7px 8px' : '5px 0',
                      marginBottom: incomplete || recovered ? 3 : 0,
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      borderLeft: incomplete ? '2px solid var(--solar)' : recovered ? '2px solid var(--aurora-green)' : 'none',
                      background: incomplete ? 'rgba(255,180,60,0.06)' : recovered ? 'rgba(0,255,136,0.05)' : 'transparent',
                      fontSize: 10,
                    }}>
                      {incomplete ? (
                        <div style={{ color: 'var(--solar)', fontWeight: 600 }}>
                          ⚠ Voice delivery incomplete
                          <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 400 }}> · {String(r.message ?? '')}</span>
                        </div>
                      ) : recovered ? (
                        <div style={{ color: 'var(--aurora-green)', fontWeight: 600 }}>
                          ✓ Recovered via SMS
                          <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 400 }}> · {String(r.message ?? '')}</span>
                        </div>
                      ) : (
                        <>
                          <span style={{ color: 'var(--plasma)' }}>{st || '—'}</span>
                          <span style={{ color: 'rgba(255,255,255,0.5)' }}> · {String(r.message ?? '')}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="panel" style={{ padding: 14 }}>
                <div style={{ ...label, marginBottom: 8 }}>FARMER REPLIES ({data.farmer_replies.length})</div>
                {data.farmer_replies.length === 0 && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>No replies recorded yet.</div>
                )}
                {data.farmer_replies.map((r, i) => {
                  const status = String(r.call_status ?? '');
                  const c = status === 'needs_help' ? 'var(--aurora-red)'
                    : status === 'confirmed' ? 'var(--aurora-green)' : 'rgba(255,255,255,0.4)';
                  return (
                    <div key={i} style={{ padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 10 }}>
                      <span style={{ color: c }}>{status.toUpperCase() || '—'}</span>
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}> · {String(r.language ?? '')}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 9, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
              {data.history_note} Escalation queue is real per-caller state (escalation_queue table) — the panels above it never invent request text or metrics.
            </div>
          </>
        )}
      </div>
    </main>
  );
}
