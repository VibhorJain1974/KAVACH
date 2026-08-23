"""Operator-facing DISCOM portal API.

Scope note (honest): this is a real, working operator VIEW backed by real data
(live Kp, real zone risk, real Supabase alert history). It is NOT multi-tenant
SaaS and the auth is a single shared password — see OPERATOR_PASSWORD below.

Deliberately ABSENT: the "Grid Response Advisor" (tell each utility exactly what
to shut down). That feature was cut in an earlier review round for having no
real grid data behind it — resurrecting it here would be the same fabricated
authority. The portal shows risk and alert history, and stops there.

Escalation queue (below): real backend state in the escalation_queue table
(supabase_migration_v3.sql), fed by the "press 2 = needs help" branch of
routers/demo.py's IVR reply handler. Request text/category comes from a real
follow-up IVR menu, not fabricated. The real phone number lives only in that
table and is deliberately never included in any response from this router —
every escalation endpoint returns phone_masked only; /escalations/{id}/callback
dials the real number server-side without exposing it in its response.
"""
import os
import json
import logging
import asyncio
import statistics
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from services.discom_mapper import DISCOMS, map_storm_to_discoms, language_for_state
from services import db
from services.db import get_client
from services.twilio_caller import call_with_fallback
from agents.noaa_agent import fetch_current_kp
from services.fallback_cache import fetch_with_fallback_async

router = APIRouter(prefix="/operator", tags=["operator"])

logger = logging.getLogger(__name__)

# DEMO-SCOPED SIMPLIFICATION, NOT PRODUCTION SECURITY.
# A single shared password for every operator, compared in plaintext over
# whatever transport is in front of it. Real deployment would need per-utility
# accounts, hashed credentials, and session management. Labelled as such in the
# UI so nobody mistakes it for an access-control claim.
OPERATOR_PASSWORD = os.getenv("OPERATOR_PASSWORD", "kavach-demo")

_DISCOM_BY_ID = {d["id"]: d for d in DISCOMS}


def _check_auth(x_operator_key: str | None):
    if not x_operator_key or x_operator_key != OPERATOR_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid operator key")


def _severity_for_kp(kp: float) -> str:
    if kp >= 7:
        return "red"
    if kp >= 5:
        return "yellow"
    return "green"


@router.get("/zones")
async def list_zones():
    """Public: which zones exist, so an operator can pick theirs at login."""
    return [
        {"id": d["id"], "name": d["name"], "state": d["state"], "region": d["region"]}
        for d in DISCOMS
    ]


@router.get("/zone/{discom_id}")
async def zone_detail(discom_id: str, x_operator_key: str | None = Header(default=None)):
    """Everything one DISCOM operator needs: current risk for their zone, the
    alert history for their zone, and farmer replies (confirmed / needs help).

    All figures are real: live Kp via the same fallback-safe fetcher every other
    feature uses, and alert rows from the real Supabase alert_log. If Supabase
    is unconfigured the portal still renders — history simply comes back empty
    and says so, rather than showing invented rows.
    """
    _check_auth(x_operator_key)

    discom = _DISCOM_BY_ID.get(discom_id.upper())
    if not discom:
        raise HTTPException(status_code=404, detail=f"Unknown DISCOM id '{discom_id}'")

    result = await fetch_with_fallback_async("live_kp", fetch_current_kp)
    data = result.get("data") or {}
    kp = float(data.get("kp") or 0)
    severity = _severity_for_kp(kp)

    # Reuse the same mapper the public dashboard uses so operator and public
    # views can never disagree about whether a zone is affected.
    zones = map_storm_to_discoms(severity, kp)
    mine = next((z for z in zones if z["id"] == discom["id"]), None)

    alerts, replies, db_state = [], [], "unavailable"
    client = get_client()
    if client is not None:
        try:
            rows = (
                client.table("alert_log")
                .select("*")
                .order("created_at", desc=True)
                .limit(50)
                .execute()
                .data
            ) or []
            db_state = "ok"
            # alert_log has no per-zone column, so calls aren't attributable to
            # a single DISCOM yet. Shown as system-wide and LABELLED that way
            # rather than silently implying these are this zone's own calls.
            alerts = [r for r in rows if r.get("alert_type") != "voice_reply"][:20]
            replies = [r for r in rows if r.get("alert_type") == "voice_reply"][:20]
        except Exception as e:
            logger.warning(f"[operator] alert_log read failed: {e}")
            db_state = "error"

    return {
        "discom": {
            "id": discom["id"],
            "name": discom["name"],
            "state": discom["state"],
            "region": discom["region"],
            "default_language": language_for_state(discom["state"]),
        },
        "current": {
            "kp": kp,
            "severity": severity,
            "affected": bool(mine and mine.get("affected")),
            "risk_level": (mine or {}).get("risk", "nominal"),
            "data_freshness": result.get("source", "unknown"),
        },
        "alert_history": alerts,
        "farmer_replies": replies,
        "history_scope": "system_wide",
        "history_note": "alert_log has no per-DISCOM column yet, so this is system-wide call history, not this zone's alone.",
        "db_state": db_state,
    }


# ---------------------------------------------------------------------------
# Escalation queue — the real "press 2" backlog. See backend/services/db.py
# for the escalation_queue table functions and supabase_migration_v3.sql for
# the schema. `phone` (the real number) lives only in escalation_queue and is
# NEVER included in any response body below — only phone_masked is.
# ---------------------------------------------------------------------------


def _public_escalation(row: dict) -> dict:
    """Project an escalation_queue row down to what an operator may see.
    Deliberately excludes `phone` — the real number is backend-only."""
    return {
        "id": row.get("id"),
        "phone_masked": row.get("phone_masked"),
        "language": row.get("language"),
        "category": row.get("category"),
        "request_note": row.get("request_note"),
        "status": row.get("status"),
        "created_at": row.get("created_at"),
        "acknowledged_by": row.get("acknowledged_by"),
        "acknowledged_at": row.get("acknowledged_at"),
        "called_back_at": row.get("called_back_at"),
    }


@router.get("/escalations")
async def list_escalations(x_operator_key: str | None = Header(default=None)):
    """Open + recently-closed escalations, most recent first. Masked phone only."""
    _check_auth(x_operator_key)
    rows = db.list_escalations(limit=100)
    return [_public_escalation(r) for r in rows]


class AckBody(BaseModel):
    zone: str  # the DISCOM the operator signed in as — the only real identity we have


@router.post("/escalations/{escalation_id}/ack")
async def ack_escalation(escalation_id: str, body: AckBody, x_operator_key: str | None = Header(default=None)):
    """Marks an escalation acknowledged, recording who (the signed-in zone) and when."""
    _check_auth(x_operator_key)
    ok = db.ack_escalation(escalation_id, acknowledged_by=body.zone)
    if not ok:
        raise HTTPException(status_code=502, detail="Could not acknowledge (DB unavailable, or already handled)")
    return {"success": True}


@router.post("/escalations/{escalation_id}/callback")
async def callback_escalation(escalation_id: str, x_operator_key: str | None = Header(default=None)):
    """Places a REAL outbound call to the number on file. The phone number
    never appears anywhere in this response — the backend reads it from
    escalation_queue internally and dials it, but only returns call outcome."""
    _check_auth(x_operator_key)
    row = db.get_escalation(escalation_id)
    if not row:
        raise HTTPException(status_code=404, detail="Escalation not found")
    phone = row.get("phone")
    if not phone:
        raise HTTPException(status_code=422, detail="No phone number on file for this escalation")

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, lambda: call_with_fallback(phone, 9.0, row.get("language") or "hindi")
    )
    db.mark_called_back(escalation_id)
    return {
        "success": bool(result.get("call_sid")),
        "call_status": result.get("status"),
        "method": result.get("method"),
    }


def _fetch_alert_log(limit: int = 2000) -> list[dict]:
    client = get_client()
    if client is None:
        return []
    try:
        return (
            client.table("alert_log").select("*").order("created_at", desc=True).limit(limit).execute().data
        ) or []
    except Exception as e:
        logger.warning(f"[operator] alert_log read failed: {e}")
        return []


@router.get("/metrics")
async def metrics(x_operator_key: str | None = Header(default=None)):
    """Real summary numbers, computed from escalation_queue + alert_log —
    nothing here is a hardcoded placeholder."""
    _check_auth(x_operator_key)

    esc_rows = db.list_escalations(limit=500)
    open_count = sum(1 for r in esc_rows if r.get("status") == "open")

    alert_rows = _fetch_alert_log()
    voice_calls = [r for r in alert_rows if r.get("alert_type") in (None, "voice_call")]
    total_reached = sum(1 for r in voice_calls if r.get("call_status") == "answered")

    replies = [r for r in alert_rows if r.get("alert_type") == "voice_reply"]
    confirmed = sum(1 for r in replies if r.get("call_status") == "confirmed")
    needs_help = sum(1 for r in replies if r.get("call_status") == "needs_help")
    reply_total = confirmed + needs_help
    press1_rate = round(100 * confirmed / reply_total, 1) if reply_total else None

    ack_deltas = []
    for r in esc_rows:
        if r.get("acknowledged_at") and r.get("created_at"):
            try:
                created = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))
                acked = datetime.fromisoformat(r["acknowledged_at"].replace("Z", "+00:00"))
                ack_deltas.append((acked - created).total_seconds())
            except Exception:
                pass
    median_ack_s = statistics.median(ack_deltas) if ack_deltas else None

    return {
        "open_escalations": open_count,
        "total_reached": total_reached,
        "press1_confirm_rate_pct": press1_rate,
        "median_ack_time_seconds": median_ack_s,
        "db_state": "ok" if get_client() is not None else "unavailable",
        "sample_sizes": {"voice_calls": len(voice_calls), "replies": reply_total, "acked_escalations": len(ack_deltas)},
    }


@router.get("/channel-outcomes")
async def channel_outcomes(x_operator_key: str | None = Header(default=None)):
    """Real percentages per channel, computed from alert_log — no hardcoded numbers."""
    _check_auth(x_operator_key)

    alert_rows = _fetch_alert_log()
    voice_calls = [r for r in alert_rows if r.get("alert_type") in (None, "voice_call")]
    replies = [r for r in alert_rows if r.get("alert_type") == "voice_reply"]
    sms_fallback = [r for r in alert_rows if r.get("alert_type") == "sms_fallback"]
    whatsapp = [r for r in alert_rows if r.get("alert_type") == "whatsapp"]

    confirmed = sum(1 for r in replies if r.get("call_status") == "confirmed")
    needs_help = sum(1 for r in replies if r.get("call_status") == "needs_help")

    # Two different populations, two different denominators — sharing one
    # denom produced nonsense (>100%) whenever reply presses outnumbered
    # placed calls, e.g. from manual /demo/reply testing without a paired
    # call. Confirmed/needs-help are shares of REPLIES received; SMS/WhatsApp
    # are shares of CALLS placed, since those are call-outcome-triggered.
    reply_denom = len(replies) or 1
    call_denom = len(voice_calls) or 1

    def pct(n: int, denom: int) -> float:
        return round(100 * n / denom, 1)

    return {
        "voice_confirmed": {"count": confirmed, "of_replies": len(replies), "pct": pct(confirmed, reply_denom)},
        "help_requested": {"count": needs_help, "of_replies": len(replies), "pct": pct(needs_help, reply_denom)},
        "sms_fallback_fired": {"count": len(sms_fallback), "of_calls": len(voice_calls), "pct": pct(len(sms_fallback), call_denom)},
        "whatsapp_sent": {"count": len(whatsapp), "of_calls": len(voice_calls), "pct": pct(len(whatsapp), call_denom)},
        "db_state": "ok" if get_client() is not None else "unavailable",
    }


@router.get("/roster")
async def roster(x_operator_key: str | None = Header(default=None)):
    """A small STATIC, configured list — not live presence-tracking. Set
    OPERATOR_ROSTER in .env to a JSON array to change it, e.g.:
    [{"name":"R. Menon","role":"Primary - Telegram","status":"ON-CALL"}]
    Unset -> empty list, honestly, rather than fabricated names/status."""
    _check_auth(x_operator_key)
    raw = os.getenv("OPERATOR_ROSTER", "")
    entries = []
    if raw:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                entries = parsed
        except Exception as e:
            logger.warning(f"[operator] OPERATOR_ROSTER is not valid JSON, ignoring: {e}")
    return {"roster": entries, "source": "static_config"}
