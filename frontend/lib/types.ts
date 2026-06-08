export interface KpReading {
  observedTime: string;
  kpIndex: number;
  source: string;
}

export interface DiscomZone {
  id: string;
  name: string;
  state: string;
  region: string;
  lat: number;
  lng: number;
  risk_level: 'green' | 'yellow' | 'orange' | 'red';
  risk_label: string;
  affected: boolean;
  max_kp?: number;
}

export interface AlertEvent {
  id: string | number;
  type: string;
  zone?: string;
  region?: string;
  count?: string;
  status: string;
  time?: string;
  timestamp: string;
  message?: string;
}

export interface DemoStep {
  step: number;
  status: string;
  message: string;
  discoms?: DiscomZone[];
  storm?: { gst_id: string; max_kp: number; severity: string; kp_readings: KpReading[] };
  alert_log?: AlertEvent[];
  call_sid?: string;
  call_status?: string;
  fallback?: boolean;
  summary?: {
    storm_kp: number;
    severity: string;
    zones_alerted: number;
    farmers_called: string;
    fishermen_called: string;
    time_to_alert: string;
    human_triggers: number;
  };
  region?: string;
}
