-- KAVACH Supabase Migration v2 — call outcome logging
-- Run this in the Supabase SQL Editor (additive, safe to re-run).
--
-- Why: the original alert_log has call_status/call_sid but no place to record
-- WHICH number was called, in WHAT language, or WHERE the recording lives.
-- services/db.py writes these three columns on every call (autonomous + live).
--
-- Privacy: phone_masked stores only the last 4 digits ("****1974"), matching
-- the existing convention in twilio_caller.py, which never logs full numbers.

alter table alert_log add column if not exists phone_masked text;
alter table alert_log add column if not exists language text;
alter table alert_log add column if not exists recording_url text;

-- call_status now carries the classified outcome rather than free text:
--   answered | voicemail | no-answer | failed
-- Left unconstrained on purpose: a CHECK constraint here would turn an
-- unexpected Twilio status into a failed insert, and bookkeeping must never
-- be able to break the call path.

create index if not exists alert_log_call_sid_idx on alert_log (call_sid);
create index if not exists alert_log_created_at_idx on alert_log (created_at desc);
