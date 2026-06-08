-- KAVACH Supabase Schema Migration
-- Run this in Supabase SQL Editor

-- Storm events from NASA DONKI
create table if not exists storm_events (
  id uuid default gen_random_uuid() primary key,
  gst_id text unique not null,
  start_time timestamptz not null,
  max_kp numeric(4,2) not null,
  severity text not null check (severity in ('green', 'yellow', 'red')),
  kp_readings jsonb default '[]',
  source text default 'NASA_DONKI',
  created_at timestamptz default now()
);

-- India DISCOM registry (28 distribution companies)
create table if not exists discom_registry (
  id text primary key,
  name text not null,
  state text not null,
  region text not null,
  lat numeric(8,4) not null,
  lng numeric(8,4) not null,
  contact_email text,
  contact_phone text,
  created_at timestamptz default now()
);

-- Subscribers for voice alerts (farmers, fishermen)
create table if not exists subscribers (
  id uuid default gen_random_uuid() primary key,
  phone text unique not null,
  name text,
  type text not null check (type in ('farmer', 'fisherman', 'operator', 'demo')),
  state text,
  language text default 'hi',
  active boolean default true,
  created_at timestamptz default now()
);

-- Alert log: every alert and call dispatched
create table if not exists alert_log (
  id uuid default gen_random_uuid() primary key,
  storm_id text references storm_events(gst_id) on delete set null,
  alert_type text not null,
  severity text not null,
  message text,
  affected_zones jsonb default '[]',
  call_status text default 'pending',
  call_sid text,
  created_at timestamptz default now()
);

-- Enable realtime on alert_log (frontend subscribes)
alter publication supabase_realtime add table alert_log;

-- Seed demo subscriber
insert into subscribers (phone, name, type, state, language) values
  ('+919729741974', 'Demo Phone (Vibbhor)', 'demo', 'Haryana', 'hi')
on conflict (phone) do nothing;
