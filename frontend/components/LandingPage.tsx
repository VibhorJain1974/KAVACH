'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// ── Count-up hook ─────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
      else setValue(target);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

// ── Stat card with count-up ───────────────────────────────────────────
function StatCard({ value, suffix = '', label, color, started }: {
  value: number; suffix?: string; label: string; color: string; started: boolean;
}) {
  const count = useCountUp(value, 1800, started);
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>
        {count.toLocaleString('en-IN')}{suffix}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, accent }: {
  icon: string; title: string; desc: string; accent: string;
}) {
  return (
    <div className="feature-card">
      <div className="feature-icon" style={{ color: accent }}>{icon}</div>
      <div className="feature-title" style={{ color: accent }}>{title}</div>
      <div className="feature-desc">{desc}</div>
    </div>
  );
}

// ── Timeline step ─────────────────────────────────────────────────────
function TimelineStep({ n, label, sub, last = false }: {
  n: string; label: string; sub: string; last?: boolean;
}) {
  return (
    <div className="timeline-step">
      <div className="timeline-node">
        <div className="timeline-dot">{n}</div>
        {!last && <div className="timeline-line" />}
      </div>
      <div className="timeline-content">
        <div className="timeline-label">{label}</div>
        <div className="timeline-sub">{sub}</div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function LandingPage() {
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        /* ── KAVACH Landing — Design Tokens ── */
        .landing-root {
          --void: #020408;
          --cosmos: #050d18;
          --nebula: #0a1628;
          --plasma: #4df0ff;
          --solar: #ffaa00;
          --aurora-green: #00ff88;
          --aurora-red: #ff2d4a;
          --aurora-yellow: #ffd23f;
          --text-primary: rgba(255,255,255,0.92);
          --text-muted: rgba(200,218,255,0.5);
          --border: rgba(77,240,255,0.12);
          --card-bg: rgba(5,13,24,0.72);

          min-height: 100dvh;
          background: var(--void);
          color: var(--text-primary);
          font-family: 'DM Mono', 'Space Grotesk', monospace;
          overflow-x: hidden;
        }

        /* ── Star field (CSS-only) ── */
        .stars-layer {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.55) 0%, transparent 100%),
            radial-gradient(1px 1px at 80% 10%, rgba(255,255,255,0.45) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 50% 70%, rgba(77,240,255,0.35) 0%, transparent 100%),
            radial-gradient(1px 1px at 10% 60%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 70% 50%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 35% 20%, rgba(255,170,0,0.25) 0%, transparent 100%),
            radial-gradient(1px 1px at 90% 80%, rgba(255,255,255,0.35) 0%, transparent 100%),
            radial-gradient(1px 1px at 15% 85%, rgba(77,240,255,0.28) 0%, transparent 100%),
            radial-gradient(1px 1px at 60% 40%, rgba(255,255,255,0.22) 0%, transparent 100%),
            radial-gradient(1px 1px at 45% 90%, rgba(255,255,255,0.18) 0%, transparent 100%),
            radial-gradient(1px 1px at 25% 55%, rgba(255,255,255,0.32) 0%, transparent 100%),
            radial-gradient(1px 1px at 85% 35%, rgba(255,255,255,0.28) 0%, transparent 100%),
            radial-gradient(1px 1px at 5% 15%, rgba(77,240,255,0.22) 0%, transparent 100%),
            radial-gradient(1px 1px at 75% 75%, rgba(255,255,255,0.2) 0%, transparent 100%),
            radial-gradient(1px 1px at 40% 5%, rgba(255,255,255,0.38) 0%, transparent 100%),
            radial-gradient(1px 1px at 55% 60%, rgba(255,170,0,0.18) 0%, transparent 100%),
            radial-gradient(1px 1px at 95% 25%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 30% 95%, rgba(255,255,255,0.25) 0%, transparent 100%),
            radial-gradient(1px 1px at 65% 15%, rgba(77,240,255,0.2) 0%, transparent 100%),
            radial-gradient(1px 1px at 8% 45%, rgba(255,255,255,0.28) 0%, transparent 100%);
        }

        /* ── Navigation ── */
        .landing-nav {
          position: fixed; top: 0; left: 0; right: 0;
          z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 32px;
          background: rgba(2,4,8,0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
        }
        .nav-logo {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 20px; font-weight: 800;
          letter-spacing: 0.28em;
          color: #fff;
          text-shadow: 0 0 20px rgba(77,240,255,0.6);
        }
        .nav-badge {
          font-size: 9px; letter-spacing: 0.18em;
          color: var(--aurora-green);
          border: 1px solid rgba(0,255,136,0.3);
          padding: 3px 8px; border-radius: 2px;
        }
        .nav-right { display: flex; align-items: center; gap: 16px; }
        .nav-link {
          font-size: 10px; letter-spacing: 0.12em;
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s;
          cursor: pointer;
        }
        .nav-link:hover { color: var(--plasma); }

        /* ── Hero section ── */
        .hero-section {
          position: relative; z-index: 1;
          min-height: 100dvh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center;
          padding: 100px 24px 80px;
        }
        .hero-eyebrow {
          font-size: 9px; letter-spacing: 0.28em;
          color: var(--aurora-green);
          border: 1px solid rgba(0,255,136,0.25);
          padding: 4px 16px; border-radius: 2px;
          margin-bottom: 32px;
          display: inline-block;
        }
        .hero-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(72px, 12vw, 160px);
          font-weight: 800;
          letter-spacing: 0.22em;
          color: #fff;
          line-height: 0.9;
          text-shadow:
            0 0 40px rgba(77,240,255,0.5),
            0 0 100px rgba(77,240,255,0.2),
            0 4px 12px rgba(0,0,0,0.9);
          margin-bottom: 24px;
        }
        .hero-hindi {
          font-size: clamp(16px, 2.5vw, 22px);
          color: var(--solar);
          letter-spacing: 0.04em;
          margin-bottom: 12px;
          font-style: italic;
          text-shadow: 0 0 20px rgba(255,170,0,0.4);
        }
        .hero-tagline {
          font-size: clamp(13px, 1.8vw, 17px);
          color: var(--text-muted);
          letter-spacing: 0.06em;
          max-width: 520px;
          line-height: 1.6;
          margin-bottom: 48px;
        }
        .hero-ctas {
          display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;
          margin-bottom: 64px;
        }
        .cta-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 32px;
          background: rgba(77,240,255,0.1);
          border: 1px solid rgba(77,240,255,0.5);
          color: var(--plasma);
          font-size: 11px; letter-spacing: 0.16em;
          text-decoration: none;
          border-radius: 2px;
          transition: all 0.2s ease;
          cursor: pointer;
          font-family: 'DM Mono', monospace;
          min-height: 48px;
        }
        .cta-primary:hover {
          background: rgba(77,240,255,0.18);
          border-color: var(--plasma);
          box-shadow: 0 0 24px rgba(77,240,255,0.25), 0 0 48px rgba(77,240,255,0.1);
          transform: translateY(-1px);
        }
        .cta-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 32px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.6);
          font-size: 11px; letter-spacing: 0.16em;
          text-decoration: none;
          border-radius: 2px;
          transition: all 0.2s ease;
          cursor: pointer;
          font-family: 'DM Mono', monospace;
          min-height: 48px;
        }
        .cta-secondary:hover {
          border-color: rgba(255,255,255,0.35);
          color: #fff;
        }
        .hero-scroll-hint {
          font-size: 9px; letter-spacing: 0.2em;
          color: rgba(255,255,255,0.2);
          animation: bounce-gentle 2s ease-in-out infinite;
        }
        @keyframes bounce-gentle {
          0%,100% { transform: translateY(0); opacity: 0.2; }
          50% { transform: translateY(5px); opacity: 0.4; }
        }

        /* ── Live status bar ── */
        .live-bar {
          position: relative; z-index: 1;
          display: flex; align-items: center; justify-content: center; gap: 24px;
          padding: 10px 32px;
          background: rgba(0,255,136,0.04);
          border-top: 1px solid rgba(0,255,136,0.12);
          border-bottom: 1px solid rgba(0,255,136,0.12);
          flex-wrap: wrap; gap: 16px 32px;
        }
        .live-item {
          display: flex; align-items: center; gap: 8px;
          font-size: 9px; letter-spacing: 0.14em;
          color: var(--text-muted);
        }
        .live-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--aurora-green);
          box-shadow: 0 0 6px var(--aurora-green);
          animation: live-pulse 2s ease-in-out infinite;
        }
        @keyframes live-pulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* ── Stats section ── */
        .stats-section {
          position: relative; z-index: 1;
          padding: 80px 24px;
          max-width: 960px; margin: 0 auto;
        }
        .section-label {
          font-size: 9px; letter-spacing: 0.28em;
          color: var(--plasma); text-align: center;
          margin-bottom: 48px;
          display: block;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: 3px;
          overflow: hidden;
        }
        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: 1fr; }
        }
        .stat-card {
          background: var(--card-bg);
          padding: 40px 32px;
          text-align: center;
          backdrop-filter: blur(16px);
          transition: background 0.3s;
        }
        .stat-card:hover { background: rgba(5,13,24,0.95); }
        .stat-value {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(40px, 6vw, 64px);
          font-weight: 800;
          line-height: 1;
          margin-bottom: 12px;
          font-variant-numeric: tabular-nums;
        }
        .stat-label {
          font-size: 10px; letter-spacing: 0.16em;
          color: var(--text-muted);
          line-height: 1.4;
        }

        /* ── Feature grid ── */
        .features-section {
          position: relative; z-index: 1;
          padding: 80px 24px;
          max-width: 960px; margin: 0 auto;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: 3px;
          overflow: hidden;
        }
        @media (max-width: 640px) {
          .features-grid { grid-template-columns: 1fr; }
        }
        .feature-card {
          background: var(--card-bg);
          padding: 32px 28px;
          backdrop-filter: blur(16px);
          transition: background 0.25s;
        }
        .feature-card:hover { background: rgba(10,22,40,0.95); }
        .feature-icon {
          font-size: 22px; margin-bottom: 14px;
          display: block;
          filter: drop-shadow(0 0 8px currentColor);
        }
        .feature-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 15px; font-weight: 700;
          letter-spacing: 0.06em;
          margin-bottom: 10px;
        }
        .feature-desc {
          font-size: 11px; line-height: 1.65;
          color: var(--text-muted);
        }

        /* ── How it works ── */
        .how-section {
          position: relative; z-index: 1;
          padding: 80px 24px;
          max-width: 720px; margin: 0 auto;
        }
        .timeline-step {
          display: flex; gap: 20px;
          margin-bottom: 0;
        }
        .timeline-node {
          display: flex; flex-direction: column; align-items: center;
          flex-shrink: 0;
        }
        .timeline-dot {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: rgba(77,240,255,0.1);
          border: 1px solid rgba(77,240,255,0.4);
          color: var(--plasma);
          font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .timeline-line {
          width: 1px; flex: 1; min-height: 32px;
          background: linear-gradient(to bottom, rgba(77,240,255,0.3), rgba(77,240,255,0.06));
          margin: 6px 0;
        }
        .timeline-content {
          padding-bottom: 32px;
        }
        .timeline-label {
          font-size: 13px; font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
          letter-spacing: 0.04em;
        }
        .timeline-sub {
          font-size: 11px; color: var(--text-muted);
          line-height: 1.5;
        }

        /* ── Demo banner ── */
        .demo-banner {
          position: relative; z-index: 1;
          margin: 0 24px 80px;
          max-width: 912px; margin-left: auto; margin-right: auto;
          border: 1px solid rgba(255,45,74,0.3);
          background: rgba(255,45,74,0.04);
          border-radius: 3px;
          padding: 40px 48px;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 24px;
          backdrop-filter: blur(16px);
        }
        .demo-banner-left { flex: 1; min-width: 240px; }
        .demo-banner-eyebrow {
          font-size: 9px; letter-spacing: 0.22em;
          color: var(--aurora-red); margin-bottom: 10px;
        }
        .demo-banner-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(18px, 3vw, 26px);
          font-weight: 700; line-height: 1.2;
          color: #fff; margin-bottom: 8px;
        }
        .demo-banner-sub {
          font-size: 11px; color: var(--text-muted); line-height: 1.5;
        }
        .demo-cta {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 14px 28px;
          background: rgba(255,45,74,0.12);
          border: 1px solid rgba(255,45,74,0.45);
          color: var(--aurora-red);
          font-size: 11px; letter-spacing: 0.16em;
          border-radius: 2px; text-decoration: none;
          transition: all 0.2s;
          white-space: nowrap;
          font-family: 'DM Mono', monospace;
          min-height: 48px;
          cursor: pointer;
        }
        .demo-cta:hover {
          background: rgba(255,45,74,0.2);
          box-shadow: 0 0 24px rgba(255,45,74,0.2);
          transform: translateY(-1px);
        }

        /* ── Footer ── */
        .landing-footer {
          position: relative; z-index: 1;
          padding: 32px 32px;
          border-top: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 16px;
        }
        .footer-left {
          font-size: 10px; color: rgba(255,255,255,0.25);
          letter-spacing: 0.1em;
        }
        .footer-right {
          display: flex; gap: 20px;
        }
        .footer-link {
          font-size: 9px; letter-spacing: 0.1em;
          color: rgba(255,255,255,0.2);
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-link:hover { color: var(--plasma); }

        /* ── Scanline ── */
        .landing-root::before {
          content: '';
          position: fixed; inset: 0;
          background: repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px
          );
          pointer-events: none; z-index: 9999;
        }
      `}</style>

      <div className="landing-root">
        <div className="stars-layer" />

        {/* Navigation */}
        <nav className="landing-nav">
          <div className="nav-logo">KAVACH</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="nav-badge">LIVE</div>
          </div>
          <div className="nav-right">
            <Link href="/dashboard" className="nav-link">DASHBOARD</Link>
            <a
              href="https://github.com/VibhorJain1974/kavach-faraway-2026"
              target="_blank" rel="noopener noreferrer"
              className="nav-link"
            >
              GITHUB
            </a>
          </div>
        </nav>

        {/* Hero */}
        <section className="hero-section">
          <div className="hero-eyebrow">FAR AWAY 2026 · SPACE & AEROSPACE · TEAM 404_SHINOBI</div>
          <h1 className="hero-title">KAVACH</h1>
          <div className="hero-hindi">कवच — भारत का सौर तूफान रक्षक</div>
          <p className="hero-tagline">
            &ldquo;It called the farmer before the lights went out.&rdquo;
          </p>
          <div className="hero-ctas">
            <Link href="/dashboard" className="cta-primary">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="7" cy="7" r="2" fill="currentColor"/>
              </svg>
              LIVE DASHBOARD
            </Link>
            <a
              href="https://github.com/VibhorJain1974/kavach-faraway-2026"
              target="_blank" rel="noopener noreferrer"
              className="cta-secondary"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              VIEW ON GITHUB
            </a>
          </div>
          <div className="hero-scroll-hint">↓ SCROLL TO EXPLORE</div>
        </section>

        {/* Live status bar */}
        <div className="live-bar">
          <div className="live-item">
            <div className="live-dot" />
            <span>NOAA KP-INDEX MONITORING</span>
          </div>
          <div className="live-item">
            <div className="live-dot" style={{ background: 'var(--plasma)', boxShadow: '0 0 6px var(--plasma)' }} />
            <span>NASA DONKI POLLING — 15 MIN INTERVAL</span>
          </div>
          <div className="live-item">
            <div className="live-dot" />
            <span>28 DISCOM ZONES TRACKED</span>
          </div>
          <div className="live-item">
            <div className="live-dot" style={{ background: 'var(--aurora-yellow)', boxShadow: '0 0 6px var(--aurora-yellow)' }} />
            <span>TWILIO HINDI ALERTS READY</span>
          </div>
        </div>

        {/* Stats */}
        <section className="stats-section" ref={statsRef}>
          <span className="section-label">COVERAGE · IMPACT · AUTONOMY</span>
          <div className="stats-grid">
            <StatCard
              value={28} label="DISCOM GRID ZONES&#10;ACROSS INDIA"
              color="var(--plasma)" started={statsVisible}
            />
            <StatCard
              value={12400} label="FARMERS & FISHERMEN&#10;REACHABLE VIA FEATURE PHONE"
              color="var(--aurora-green)" started={statsVisible}
            />
            <StatCard
              value={0} suffix=" HUMAN&#10;TRIGGERS"
              label="FULLY AUTONOMOUS&#10;END-TO-END"
              color="var(--aurora-yellow)" started={statsVisible}
            />
          </div>
        </section>

        {/* How it works */}
        <section className="how-section">
          <span className="section-label" style={{ display: 'block', textAlign: 'center', marginBottom: 48 }}>
            HOW KAVACH WORKS
          </span>
          <TimelineStep
            n="01"
            label="Solar Storm Detected"
            sub="NASA DONKI + NOAA SWPC APIs polled every 15 minutes autonomously. No human trigger."
          />
          <TimelineStep
            n="02"
            label="India Risk Mapped"
            sub="Storm severity classifier maps Kp-index to 28 DISCOM grid zones — north-first by geomagnetic exposure."
          />
          <TimelineStep
            n="03"
            label="DISCOM Operators Alerted"
            sub="Technical grid impact data sent to utility operators with 4.5-hour advance warning."
          />
          <TimelineStep
            n="04"
            label="Farmers Called in Hindi"
            sub="Twilio fires Hindi TTS voice call to registered farmers and fishermen on basic feature phones. No app. No internet."
            last
          />
        </section>

        {/* Feature grid */}
        <section className="features-section">
          <span className="section-label">WHAT&apos;S INSIDE</span>
          <div className="features-grid">
            <FeatureCard
              icon="◉"
              title="COMMAND CENTER"
              desc="Live India map with 28 DISCOM zones. Real-time Kp gauge, alert feed, and storm severity overlay. The full picture in one view."
              accent="var(--plasma)"
            />
            <FeatureCard
              icon="◈"
              title="AURORA PREDICTOR"
              desc="Kp-based northern lights visibility forecast for 6 Indian locations — from Ladakh to Spiti Valley. India's first aurora probability layer."
              accent="var(--aurora-green)"
            />
            <FeatureCard
              icon="◆"
              title="DAILY SHIELD SCORE"
              desc="Space Weather Score 0–100. India's space weather AQI — Hindi and English morning briefing for operators and citizens."
              accent="var(--aurora-yellow)"
            />
            <FeatureCard
              icon="◎"
              title="STORM MEMORY"
              desc="4 historical storms since 2003. Counterfactual: if KAVACH existed, 847 alerts would have fired with 6h average lead time."
              accent="var(--solar)"
            />
          </div>
        </section>

        {/* Demo banner */}
        <div className="demo-banner">
          <div className="demo-banner-left">
            <div className="demo-banner-eyebrow">LIVE REPLAY — MAY 2024 G5 STORM</div>
            <div className="demo-banner-title">
              The strongest storm in 20 years.<br />
              Watch KAVACH respond in real time.
            </div>
            <div className="demo-banner-sub">
              Kp=9.0 · 28 zones lit red · Hindi call fires · 22.6 seconds end-to-end
            </div>
          </div>
          <Link href="/dashboard" className="demo-cta">
            <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
              <path d="M0 0v14l12-7z"/>
            </svg>
            LAUNCH DEMO
          </Link>
        </div>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="footer-left">
            KAVACH · FAR AWAY 2026 · TEAM 404_SHINOBI · SPACE & AEROSPACE
          </div>
          <div className="footer-right">
            <Link href="/dashboard" className="footer-link">DASHBOARD</Link>
            <a
              href="https://github.com/VibhorJain1974/kavach-faraway-2026"
              target="_blank" rel="noopener noreferrer"
              className="footer-link"
            >
              GITHUB
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
