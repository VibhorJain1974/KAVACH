'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from './Header';
import KpGauge from './KpGauge';
import AlertFeed from './AlertFeed';
import DemoPanel from './DemoPanel';
import IndiaMap from './IndiaMap';
import StatusBar from './StatusBar';
import AudioFallback, { type AudioFallbackRef } from './AudioFallback';
import type { DiscomZone, AlertEvent, DemoStep } from '@/lib/types';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function Dashboard() {
  const [zones, setZones] = useState<DiscomZone[]>([]);
  const [currentKp, setCurrentKp] = useState(0);
  const [severity, setSeverity] = useState<'green' | 'yellow' | 'red'>('green');
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState<DemoStep | null>(null);
  const [statusMessage, setStatusMessage] = useState('KAVACH monitoring active — all clear');
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const audioRef = useRef<AudioFallbackRef>(null);

  // Load initial DISCOM zones
  useEffect(() => {
    fetch(`${BACKEND}/alerts/discoms`)
      .then(r => r.json())
      .then(setZones)
      .catch(() => {});

    fetch(`${BACKEND}/storm/current`)
      .then(r => r.json())
      .then(d => { if (d.kp) setCurrentKp(d.kp); })
      .catch(() => {});
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
  }, [demoRunning]);

  const resetDemo = useCallback(() => {
    setZones(prev => prev.map(z => ({ ...z, risk_level: 'green', affected: false })));
    setCurrentKp(0);
    setSeverity('green');
    setAlerts([]);
    setDemoStep(null);
    setCallStatus(null);
    setStatusMessage('KAVACH monitoring active — all clear');
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ background: 'var(--void)' }}>
      <AudioFallback ref={audioRef} />
      <Header severity={severity} currentKp={currentKp} />

      <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '1fr 320px', gridTemplateRows: '1fr' }}>
        {/* Main map area */}
        <div className="relative overflow-hidden">
          <IndiaMap zones={zones} severity={severity} />
          <StatusBar message={statusMessage} severity={severity} demoRunning={demoRunning} />
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-0 overflow-hidden" style={{ borderLeft: '1px solid rgba(77,240,255,0.1)' }}>
          <KpGauge value={currentKp} severity={severity} />
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
  );
}
