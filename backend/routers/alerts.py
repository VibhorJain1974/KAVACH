from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException
from models.schemas import CallRequest
from services.twilio_caller import make_alert_call, get_call_status
from services.discom_mapper import get_all_discoms, map_storm_to_discoms, get_zone_languages
from services.db import get_client

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/discoms")
async def get_discoms(severity: str = "green", kp: float = 0):
    if severity == "green" and kp == 0:
        return get_all_discoms()
    return map_storm_to_discoms(severity, kp)


@router.get("/zone-languages")
async def zone_languages():
    """Default alert language per DISCOM zone, derived from each state's
    predominant language. Exposed for inspection and for the operator portal;
    the autonomous replay path deliberately does not consume this (see
    findings.md — the replay dials one demo number, so per-zone language
    selection has no meaning there and wiring it in would add risk to the
    zero-human-trigger flow for no benefit)."""
    return get_zone_languages()


@router.post("/call")
async def trigger_call(req: CallRequest):
    """Manually trigger a Hindi alert call."""
    try:
        result = make_alert_call(req.phone_number, req.max_kp)
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/call/{call_sid}")
async def check_call(call_sid: str):
    try:
        return get_call_status(call_sid)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/delivery-incomplete-recent")
async def delivery_incomplete_recent(since_minutes: int = 10):
    """Public, read-only feed for the Command Center's transparency banner
    (B8, 2026-08-22): recent delivery_incomplete voice-call rows and their
    linked SMS-recovery rows from alert_log.

    No operator key required — this only ever exposes what alert_log already
    stores for every voice call (phone_masked, never a raw number; see
    services/db.py mask_phone()), the same trust boundary as the rest of the
    public dashboard's zone/summary data.
    """
    client = get_client()
    if client is None:
        return []
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=since_minutes)).isoformat()
    try:
        rows = (
            client.table("alert_log")
            .select("*")
            .gte("created_at", cutoff)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
            .data
        ) or []
    except Exception:
        return []
    return [
        r for r in rows
        if r.get("call_status") == "delivery_incomplete"
        or (r.get("alert_type") == "sms_fallback" and "delivery_incomplete" in (r.get("message") or ""))
    ]
