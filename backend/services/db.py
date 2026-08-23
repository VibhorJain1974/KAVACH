"""Supabase client + alert_log writer.

Design rule for this whole module: the phone call is the product, the database
row is bookkeeping. NOTHING here may raise, block meaningfully, or change
behaviour of the call path. If Supabase is unconfigured or unreachable, KAVACH
must behave exactly as it did before this module existed.
"""
import os
import logging
import threading
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
# README documents this as SUPABASE_KEY, but the actual .env in this project
# uses SUPABASE_SERVICE_ROLE_KEY. Accept either so neither breaks.
SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
)

_client = None
_init_attempted = False


def get_client():
    """Lazily create the Supabase client. Returns None if unconfigured or if
    creation fails — callers must treat None as 'logging disabled', not error."""
    global _client, _init_attempted
    if _init_attempted:
        return _client
    _init_attempted = True

    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.info("[db] SUPABASE_URL/KEY not set — alert logging disabled (calls unaffected)")
        return None
    try:
        from supabase import create_client
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("[db] Supabase client ready")
    except Exception as e:
        logger.warning(f"[db] Supabase client init failed — logging disabled (calls unaffected): {e}")
        _client = None
    return _client


def mask_phone(phone: str | None) -> str:
    """Store only the last 4 digits. Matches the existing convention in
    twilio_caller.py, which logs to_number[-4:] rather than full numbers."""
    if not phone:
        return "unknown"
    return f"****{phone[-4:]}"


def log_call(
    phone: str,
    language: str,
    outcome: str,
    call_sid: str | None,
    recording_url: str | None = None,
    severity: str = "red",
    message: str | None = None,
    alert_type: str = "voice_call",
) -> None:
    """Fire-and-forget write of one call outcome to alert_log.

    Runs on a daemon thread so a slow/hanging Supabase never delays a call.
    Deliberately does NOT set storm_id: that column is a FK to
    storm_events(gst_id), and writing an id with no matching storm row would
    fail the insert. Live/judge calls have no storm, so it stays NULL.
    """
    client = get_client()
    if client is None:
        return

    row = {
        "alert_type": alert_type,
        "severity": severity,
        "message": message or f"KAVACH voice alert ({language}) -> {mask_phone(phone)} [{outcome}]",
        "call_status": outcome,
        "call_sid": call_sid,
        "phone_masked": mask_phone(phone),
        "language": language,
        "recording_url": recording_url,
    }

    def _write():
        try:
            client.table("alert_log").insert(row).execute()
            logger.info(f"[db] alert_log row written: {outcome} {language} sid={(call_sid or '')[-8:]}")
        except Exception as e:
            # Most likely cause if this fires: supabase_migration_v2.sql hasn't
            # been run, so phone_masked/language/recording_url don't exist yet.
            # Retry once with only the columns guaranteed by the original schema
            # so we still capture the outcome rather than losing it entirely.
            logger.warning(f"[db] alert_log insert failed ({e}) — retrying with base columns only")
            try:
                base = {k: row[k] for k in ("alert_type", "severity", "message", "call_status", "call_sid")}
                client.table("alert_log").insert(base).execute()
                logger.info("[db] alert_log row written (base columns only — run supabase_migration_v2.sql)")
            except Exception as e2:
                logger.warning(f"[db] alert_log insert failed permanently, continuing anyway: {e2}")

    threading.Thread(target=_write, daemon=True).start()


# ---------------------------------------------------------------------------
# escalation_queue — the real "press 2" backlog an operator works from.
# `phone` is the ONLY place in this codebase that keeps a full number at
# rest; routers/operator.py must never let it leak into an API response.
# Writes from the call path (create/update_category) are fire-and-forget,
# same rule as log_call above. Reads/writes from the operator API
# (list/get/ack/mark_called_back) are synchronous — those are direct
# operator-initiated HTTP requests that need a real success/failure result.
# ---------------------------------------------------------------------------

GENERIC_ESCALATION_TEXT = "Help requested during storm alert call."
ESCALATION_CATEGORY_TEXT = {
    "equipment": "Help requested — about equipment or power connection (from IVR follow-up).",
    "at_sea": "Help requested — caller reports being at sea (from IVR follow-up).",
    "other": "Help requested — other reason (from IVR follow-up).",
}


def create_escalation(call_sid: str | None, phone: str | None, language: str) -> None:
    """Fire-and-forget: create the queue row the instant 'press 2' is
    detected, before we know the follow-up category. This way an escalation
    is never lost if the caller hangs up or times out on the follow-up menu."""
    client = get_client()
    if client is None:
        return

    row = {
        "call_sid": call_sid or None,
        "phone": phone or None,
        "phone_masked": mask_phone(phone),
        "language": language,
        "status": "open",
        "request_note": GENERIC_ESCALATION_TEXT,
    }

    def _write():
        try:
            client.table("escalation_queue").insert(row).execute()
            logger.info(f"[db] escalation_queue row created sid={(call_sid or '')[-8:]}")
        except Exception as e:
            logger.warning(f"[db] escalation_queue insert failed (run supabase_migration_v3.sql?): {e}")

    threading.Thread(target=_write, daemon=True).start()


def update_escalation_category(call_sid: str | None, category: str | None) -> None:
    """Fire-and-forget: fill in the real category once the follow-up digit
    arrives, updating the row created by create_escalation rather than
    inserting a second one. No-op if call_sid is missing or no open row
    matches it (e.g. Supabase unconfigured when the original row was made)."""
    if not call_sid:
        return
    client = get_client()
    if client is None:
        return

    text = ESCALATION_CATEGORY_TEXT.get(category or "", GENERIC_ESCALATION_TEXT)

    def _write():
        try:
            (
                client.table("escalation_queue")
                .update({"category": category, "request_note": text})
                .eq("call_sid", call_sid)
                .eq("status", "open")
                .execute()
            )
            logger.info(f"[db] escalation_queue category updated sid={call_sid[-8:]} -> {category or 'unspecified'}")
        except Exception as e:
            logger.warning(f"[db] escalation_queue category update failed: {e}")

    threading.Thread(target=_write, daemon=True).start()


def list_escalations(limit: int = 100) -> list[dict]:
    client = get_client()
    if client is None:
        return []
    try:
        return (
            client.table("escalation_queue")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
            .data
        ) or []
    except Exception as e:
        logger.warning(f"[db] escalation_queue read failed: {e}")
        return []


def get_escalation(escalation_id: str) -> dict | None:
    client = get_client()
    if client is None:
        return None
    try:
        rows = (
            client.table("escalation_queue")
            .select("*")
            .eq("id", escalation_id)
            .limit(1)
            .execute()
            .data
        )
        return rows[0] if rows else None
    except Exception as e:
        logger.warning(f"[db] escalation_queue lookup failed: {e}")
        return None


def ack_escalation(escalation_id: str, acknowledged_by: str) -> bool:
    client = get_client()
    if client is None:
        return False
    try:
        now = datetime.now(timezone.utc).isoformat()
        (
            client.table("escalation_queue")
            .update({"status": "acknowledged", "acknowledged_by": acknowledged_by, "acknowledged_at": now})
            .eq("id", escalation_id)
            .eq("status", "open")
            .execute()
        )
        return True
    except Exception as e:
        logger.warning(f"[db] escalation_queue ack failed: {e}")
        return False


def mark_called_back(escalation_id: str) -> bool:
    client = get_client()
    if client is None:
        return False
    try:
        now = datetime.now(timezone.utc).isoformat()
        (
            client.table("escalation_queue")
            .update({"status": "called_back", "called_back_at": now})
            .eq("id", escalation_id)
            .execute()
        )
        return True
    except Exception as e:
        logger.warning(f"[db] escalation_queue called_back update failed: {e}")
        return False
