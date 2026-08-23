-- KAVACH Supabase Migration v3 — real escalation queue
-- Run this in the Supabase SQL Editor (additive, safe to re-run).
--
-- Why: alert_log never stores a caller's real phone number (only
-- phone_masked, e.g. "****1974") — by design, so a callback needs somewhere
-- that legitimately holds the real number for backend-only use. escalation_queue
-- is that place. `phone` here is NEVER returned by any API response — see
-- routers/operator.py, which always projects it out before responding.
--
-- category/request_note come from a real follow-up IVR menu (press 1 =
-- equipment, 2 = at sea, 3 = other) played right after "press 2" during the
-- alert-confirmation call. A row is created the moment "press 2" is detected
-- (so an escalation is never lost if the follow-up menu times out) and is
-- updated in place if/when the follow-up digit arrives — never a second row.

create table if not exists escalation_queue (
  id uuid default gen_random_uuid() primary key,
  call_sid text,
  phone text,                    -- real number; backend-only, never exposed via API
  phone_masked text not null,
  language text,
  category text,                 -- 'equipment' | 'at_sea' | 'other' | null (unspecified)
  request_note text not null default 'Help requested during storm alert call.',
  status text not null default 'open' check (status in ('open', 'acknowledged', 'called_back')),
  acknowledged_by text,
  acknowledged_at timestamptz,
  called_back_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists escalation_queue_status_idx on escalation_queue (status);
create index if not exists escalation_queue_call_sid_idx on escalation_queue (call_sid);
create index if not exists escalation_queue_created_at_idx on escalation_queue (created_at desc);
