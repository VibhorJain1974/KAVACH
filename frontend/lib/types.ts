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
  calls?: { call_sid: string; status: string; method: string; to: string }[];
  fallback?: boolean;
  summary?: {
    storm_kp: number;
    severity: string;
    zones_alerted: number;
    farmers_called: string;
    fishermen_called: string;
    time_to_alert: string;
    human_triggers: number;
    timeline?: {
      storm_start: string;
      kavach_alert: string;
      peak_impact: string;
      warning_window_hours: number;
    };
    damage_avoided?: {
      transformer_cost_crore: number;
      replacement_months: number;
      total_risk_crore: number;
      kavach_cost_lakh_month: number;
      roi_x: string;
    };
    moat?: string;
    built_with?: string;
  };
  region?: string;
}
