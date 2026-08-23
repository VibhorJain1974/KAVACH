from fastapi import APIRouter, HTTPException
from models.schemas import CallRequest
from services.twilio_caller import make_alert_call, get_call_status
from services.discom_mapper import get_all_discoms, map_storm_to_discoms, get_zone_languages

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
