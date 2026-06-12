'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import KpGauge from './KpGauge';
import AlertFeed from './AlertFeed';
import DemoPanel from './DemoPanel';
import IndiaMap from './IndiaMap';
import StatusBar from './StatusBar';
import AudioFallback, { type AudioFallbackRef } from './AudioFallback';
import AuroraTab from './AuroraTab';
import DailyShieldTab from './DailyShieldTab';
import MemoryTab from './MemoryTab';
import type { DiscomZone, AlertEvent, DemoStep } from '@/lib/types';

// SolarHeader uses Three.js — dynamic import prevents SSR issues
import dynamic from 'next/dynamic';
const SolarHeader = dynamic(() => import('./SolarHeader'), { ssr: false });

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

type Tab = 'command' | 'aurora' | 'shield' | 'memory';

const TAB_LABELS: Record<Tab, string> = {
  command: 'COMMAND',
  aurora: 'AURORA',
  shield: 'DAILY SHIELD',
  memory: 'MEMORY',
};

export default function Dashboard() {
  const [zones, setZones] = useState<DiscomZone[]>([]);
  const [currentKp, setCurrentKp] = useState(0);
  const [severity, setSeverity] = useState<'green' | 'yellow' | 'red'>('green');
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState<DemoStep | null>(null);
  const [statusMessage, setStatusMessage] = useState('KAVACH monitoring active — all clear');
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('command');
  const [shieldScore, setShieldScore] = useState<number | null>(null);
  const audioRef = useRef<AudioFallbackRef>(null);

  useEffect(() => {
    fetch(`${BACKEND}/alerts/discoms`)
      .then(r => r.json())
      .then(setZones)
      .catch(() => {});

    fetch(`${BACKEND}/storm/current`)
      .then(r => r.json())
      .then(d => { if (d.kp) setCurrentKp(d.kp); })
      .catch(() => {});

    fetch(`${BACKEND}/shield/score`)
      .then(r => r.json())
      .then(d => { if (typeof d.score === 'number') setShieldScore(d.score); })
      .catch(() => { setShieldScore(95); });
  }, []);

  const runDemo = useCallback(async () => {
    if (demoRunning) return;
    setDemoRunning(true);
    setAlerts([]);
    setCallStatus(null);

    try {
      const res = await fetch(`${BACKEND}/demo/replay`, { method: 'POST' });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try {
            const event: DemoStep = JSON.parse(line.slice(5).trim());
            setDemoStep(event);
            setStatusMessage(event.message);

            if (event.discoms) setZones(event.discoms);
            if (event.storm?.max_kp) setCurrentKp(event.storm.max_kp);
            if (event.storm?.severity) setSeverity(event.storm.severity as 'green'|'yellow'|'red');
            if (event.alert_log) {
              const log = event.alert_log;
              setAlerts(prev => [
                ...log.map((a: AlertEvent) => ({ ...a, timestamp: new Date().toISOString() })),
                ...prev,
              ].slice(0, 20));
            }

            if (event.step === 3 && event.storm?.max_kp) {
              const kp = event.storm.max_kp;
              const newScore = Math.max(0, 100 - (kp >= 8 ? 80 : kp >= 7 ? 60 : 30));
              setShieldScore(newScore);
            }
            if (event.call_sid) setCallStatus(`Call placed — SID: ${event.call_sid.slice(-8)}`);
            if (event.fallback) audioRef.current?.play();
            if (event.status === 'complete') {
              setCurrentKp(event.summary?.storm_kp || 9.0);
              setSeverity('red');
            }
          } catch {}
        }
      }
    } catch {
      setStatusMessage('Demo connection error — check backend is running');
    } finally {
      setDemoRunning(false);
    }
  }, [demoRunning, activeTab]);

  const resetDemo = useCallback(() => {
    setZones(prev => prev.map(z => ({ ...z, risk_level: 'green', affected: false })));
    setCurrentKp(0);
    setSeverity('green');
    setAlerts([]);
    setDemoStep(null);
    setCallStatus(null);
    setShieldScore(95);
    setStatusMessage('KAVACH monitoring active — all clear');
  }, []);

  const stormActive = severity === 'red';

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ background: 'var(--void)' }}>
      <AudioFallback ref={audioRef} />

      <SolarHeader stormActive={stormActive} kp={currentKp} />

      <div className="tab-bar" style={{ background: 'rgba(5,13,24,0.95)', paddingLeft: 16 }}>
        {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
          <button
            key={tab}
            className={`tab-btn${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
            {tab === 'shield' && shieldScore !== null && (
              <span style={{
                display: 'inline-block', marginLeft: 6, fontSize: 7,
                color: shieldScore >= 80 ? '#00ff88' : shieldScore >= 40 ? '#ffd23f' : '#ff4444',
                fontFamily: 'DM Mono, monospace', verticalAlign: 'middle',
              }}>
                [{shieldScore}]
              </span>
            )}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, paddingRight: 16 }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: stormActive ? '#ff4444' : '#00ff88',
            boxShadow: stormActive ? '0 0 6px #ff4444' : '0 0 6px #00ff88',
          }} className={stormActive ? 'animate-pulse-danger' : ''} />
          <span style={{ fontSize: 8, color: 'rgba(224,224,255,0.4)', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace' }}>
            {stormActive ? 'STORM ACTIVE' : 'NOMINAL'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">

        {/* COMMAND CENTER TAB */}
        {activeTab === 'command' && (
          <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 320px' }}>
            <div className="relative overflow-hidden">
              <IndiaMap zones={zones} severity={severity} />
              <StatusBar message={statusMessage} severity={severity} demoRunning={demoRunning} />
            </div>
            <div className="flex flex-col overflow-hidden" style={{ borderLeft: '1px solid rgba(0,212,255,0.1)' }}>
              <KpGauge value={currentKp} severity={severity} />
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <DemoPanel
                  onRun={runDemo}
                  onReset={resetDemo}
                  running={demoRunning}
                  step={demoStep}
                  callStatus={callStatus}
                />
                <AlertFeed alerts={alerts} />
              </div>
            </div>
          </div>
        )}

        {/* AURORA TAB */}
        {activeTab === 'aurora' && (
          <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 400px' }}>
                <div className="relative overflow-hidden">
              <IndiaMap zones={zones} severity={severity} />
            </div>
            <div style={{ borderLeft: '1px solid rgba(0,212,255,0.1)', overflowY: 'auto' }}>
              <AuroraTab kp={currentKp} backendUrl={BACKEND} />
            </div>
          </div>
        )}

        {/* DAILY SHIELD TAB */}
        {activeTab === 'shield' && (
          <div style={{ height: '100%', display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
            <div style={{ maxWidth: 600, width: '100%', padding: '0 16px' }}>
              <DailyShieldTab kp={currentKp} backendUrl={BACKEND} />
            </div>
          </div>
        )}

        {/* MEMORY TAB */}
        {activeTab === 'memory' && (
          <div style={{ height: '100%', display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
            <div style={{ maxWidth: 700, width: '100%', padding: '0 16px' }}>
              <MemoryTab backendUrl={BACKEND} demoActive={demoRunning} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
