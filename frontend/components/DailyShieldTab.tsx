'use client';

import { useEffect, useState } from 'react';

interface ShieldBrief {
  score: number;
  kp: number;
  date: string;
  gps_status: string;
  grid_risk: string;
  actions: string[];
  hindi: string;
  english: string;
  cme_inbound: boolean;
}

interface DailyShieldTabProps {
  kp: number;
  backendUrl: string;
}

export default function DailyShieldTab({ kp, backendUrl }: DailyShieldTabProps) {
  const [brief, setBrief] = useState<ShieldBrief | null>(null);
  const [lang, setLang] = useState<'hindi' | 'english'>('english');

  useEffect(() => {
    fetch(`${backendUrl}/shield/daily-brief`)
      .then(r => r.json())
      .then(setBrief)
      .catch(() => {
        // Fallback: compute client-side with kp
        setBrief(buildFallbackBrief(kp));
      });
  }, [kp, backendUrl]);

  const displayBrief = brief || buildFallbackBrief(kp);
  const score = displayBrief.score;

  // SVG gauge parameters
  const RADIUS = 70;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;
  const scoreColor = score >= 80 ? '#00ff88' : score >= 60 ? '#ffd23f' : score >= 40 ? '#ff6b35' : '#ff4444';
  const scoreLabel = score >= 80 ? 'NOMINAL' : score >= 60 ? 'MINOR DISTURBANCE' : score >= 40 ? 'MODERATE STORM' : score >= 20 ? 'SEVERE STORM' : 'EXTREME — G5';

  return (
    <div style={{ padding: 16, height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', color: '#00d4ff', marginBottom: 4 }}>
          DAILY SHIELD
        </div>
        <div style={{ fontSize: 9, color: 'rgba(224,224,255,0.4)', letterSpacing: '0.1em' }}>
          INDIA SPACE WEATHER INDEX — {displayBrief.date}
        </div>
      </div>

      {/* Score gauge */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', width: 180, height: 180 }}>
          <svg width="180" height="180" viewBox="0 0 180 180">
            {/* Background ring */}
            <circle
              cx="90" cy="90" r={RADIUS}
              fill="none"
              stroke="rgba(224,224,255,0.06)"
              strokeWidth="8"
            />
            {/* Score ring */}
            <circle
              cx="90" cy="90" r={RADIUS}
              fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 90 90)"
              style={{
                transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease',
                filter: `drop-shadow(0 0 6px ${scoreColor})`,
              }}
            />
          </svg>
          {/* Center text */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              fontSize: 36, fontWeight: 700, color: scoreColor,
              fontFamily: 'DM Mono, monospace',
              textShadow: `0 0 20px ${scoreColor}50`,
              lineHeight: 1,
            }}>{score}</div>
            <div style={{ fontSize: 8, color: 'rgba(224,224,255,0.4)', letterSpacing: '0.1em', marginTop: 4 }}>/ 100</div>
            <div style={{ fontSize: 7, color: scoreColor, letterSpacing: '0.12em', marginTop: 6, textAlign: 'center' }}>
              {scoreLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Status grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'GPS STATUS', value: displayBrief.gps_status, alert: displayBrief.gps_status !== 'Normal' },
          { label: 'GRID RISK', value: displayBrief.grid_risk, alert: displayBrief.grid_risk !== 'Minimal' },
          { label: 'Kp INDEX', value: displayBrief.kp.toFixed(1), alert: displayBrief.kp >= 5 },
          { label: 'CME WATCH', value: displayBrief.cme_inbound ? 'ACTIVE' : 'Clear', alert: displayBrief.cme_inbound },
        ].map(({ label, value, alert }) => (
          <div key={label} style={{
            padding: '8px 10px',
            background: alert ? 'rgba(255,68,68,0.06)' : 'rgba(224,224,255,0.03)',
            border: `1px solid ${alert ? 'rgba(255,68,68,0.2)' : 'rgba(224,224,255,0.07)'}`,
          }}>
            <div style={{ fontSize: 7, color: 'rgba(224,224,255,0.4)', letterSpacing: '0.12em', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: alert ? '#ff4444' : '#e0e0ff', fontFamily: 'DM Mono, monospace' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Recommended actions */}
      {displayBrief.actions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(224,224,255,0.4)', marginBottom: 6 }}>
            RECOMMENDED ACTIONS
          </div>
          {displayBrief.actions.map((action, i) => (
            <div key={i} style={{
              fontSize: 9, color: '#e0e0ff', padding: '4px 0',
              borderBottom: '1px solid rgba(224,224,255,0.04)',
              display: 'flex', gap: 6, alignItems: 'flex-start',
            }}>
              <span style={{ color: '#00d4ff', flexShrink: 0 }}>›</span>
              {action}
            </div>
          ))}
        </div>
      )}

      {/* Briefing text with language toggle */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(224,224,255,0.4)' }}>
            MORNING BRIEFING
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['english', 'hindi'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  fontSize: 7, letterSpacing: '0.1em', padding: '2px 8px',
                  background: lang === l ? 'rgba(0,212,255,0.15)' : 'transparent',
                  border: `1px solid ${lang === l ? 'rgba(0,212,255,0.4)' : 'rgba(224,224,255,0.1)'}`,
                  color: lang === l ? '#00d4ff' : 'rgba(224,224,255,0.4)',
                  cursor: 'pointer',
                }}
              >
                {l === 'hindi' ? 'हिंदी' : 'ENG'}
              </button>
            ))}
          </div>
        </div>
        <div style={{
          padding: '10px 12px',
          background: 'rgba(224,224,255,0.03)',
          border: '1px solid rgba(224,224,255,0.06)',
          fontSize: 9, lineHeight: 1.7,
          color: 'rgba(224,224,255,0.65)',
          fontFamily: lang === 'hindi' ? 'sans-serif' : 'DM Mono, monospace',
          whiteSpace: 'pre-line',
        }}>
          {lang === 'hindi' ? displayBrief.hindi : displayBrief.english}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 7, color: 'rgba(224,224,255,0.2)', letterSpacing: '0.05em' }}>
        KAVACH Daily Shield broadcasts at 6:30 AM IST via APScheduler · SMS/WhatsApp coming Q3 2026
      </div>
    </div>
  );
}

function buildFallbackBrief(kp: number): ShieldBrief {
  const score = Math.max(0, 100 - (kp >= 8 ? 80 : kp >= 7 ? 60 : kp >= 5 ? 30 : kp >= 3 ? 10 : 0));
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const gps_status = kp >= 7 ? 'Severely Degraded' : kp >= 5 ? 'Moderate Degradation' : kp >= 3 ? 'Minor Degradation' : 'Normal';
  const grid_risk = kp >= 7 ? 'High' : kp >= 5 ? 'Elevated' : 'Minimal';
  const actions = kp >= 7
    ? ['Activate storm protocols at all substations', 'Pre-position spare transformers', 'Alert grid operators']
    : kp >= 5
    ? ['Monitor grid for voltage fluctuations', 'Check GPS-dependent systems']
    : ['No action required — nominal conditions'];

  return {
    score, kp, date, gps_status, grid_risk, actions,
    cme_inbound: false,
    hindi: [
      `KAVACH सुरक्षा संदेश — ${date}`,
      `आज का स्पेस वेदर स्कोर: ${score}/100`,
      `GPS शुद्धता: ${kp >= 7 ? 'गंभीर रूप से खराब' : kp >= 5 ? 'मध्यम गिरावट' : kp >= 3 ? 'मामूली गिरावट' : 'सामान्य'}`,
      `ग्रिड सुरक्षा: ${kp >= 7 ? 'उच्च' : kp >= 5 ? 'बढ़ा हुआ' : 'न्यूनतम'}`,
      `किसी भी समस्या के लिए: KAVACH सक्रिय है।`,
    ].join('\n'),
    english: `KAVACH Daily Shield - ${date}\nSpace Weather Score: ${score}/100\nKp Current: ${kp.toFixed(1)}\nGPS Status: ${gps_status}\nGrid Risk: ${grid_risk}`,
  };
}
