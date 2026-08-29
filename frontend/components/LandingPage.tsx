'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import '@/app/landing.css';

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
    <div className="landing-root">

        <div className="stars-layer" />
        <div className="stars-sm" />
        <div className="stars-md" />
        <div className="stars-lg" />
        <div className="shooting-stars" />

        {/* Navigation */}
        <nav className="landing-nav">
          <div className="nav-logo">KAVACH</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="nav-badge">LIVE</div>
          </div>
          <div className="nav-right">
            <Link href="/dashboard" className="nav-link">DASHBOARD</Link>
            <a
              href="https://github.com/VibhorJain1974/KAVACH"
              target="_blank" rel="noopener noreferrer"
              className="nav-link"
            >
              GITHUB
            </a>
          </div>
        </nav>

        {/* Hero */}
        <section className="hero-section">
          <div className="hero-eyebrow">BUILD WITH BHARAT 2.0 · CODEVERSE · TEAM 404SHINOBI</div>
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
              href="https://github.com/VibhorJain1974/KAVACH"
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
            KAVACH · BUILD WITH BHARAT 2.0 · TEAM 404SHINOBI · CODEVERSE
          </div>
          <div className="footer-right">
            <Link href="/dashboard" className="footer-link">DASHBOARD</Link>
            <a
              href="https://github.com/VibhorJain1974/KAVACH"
              target="_blank" rel="noopener noreferrer"
              className="footer-link"
            >
              GITHUB
            </a>
          </div>
        </footer>
      </div>
  );
}
