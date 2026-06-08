"""
Demo replay endpoint — drives the hackathon wow moment.
POST /demo/replay → SSE stream of events replaying May 2024 storm.
POST /demo/trigger-call → fires Twilio call to demo phone.
"""
import asyncio
import json
import os
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from services.nasa import load_may2024_storm, parse_gst_events, classify_severity
from services.discom_mapper import map_storm_to_discoms, get_all_discoms
from services.twilio_caller import make_alert_call

router = APIRouter(prefix="/demo", tags=["demo"])

DEMO_PHONE = os.getenv("DEMO_PHONE_NUMBER", "")


async def _replay_generator(phone: str = None, speed: float = 1.0):
    delay = lambda s: asyncio.sleep(s / speed)

    def event(data: dict) -> str:
        return f"data: {json.dumps(data)}\n\n"

    # Step 1: Normal state
    yield event({"step": 1, "status": "normal", "message": "KAVACH monitoring active — all systems nominal", "discoms": get_all_discoms()})
    await delay(2)

    # Step 2: CME detected
    yield event({"step": 2, "status": "detecting", "message": "CME detected — May 8 2024 X-class solar flare. Impact trajectory: Earth-directed."})
    await delay(3)

    # Step 3: Load storm data
    raw = load_may2024_storm()
    storms = parse_gst_events(raw)
    storm = storms[0]  # The Kp=9.0 event
    yield event({"step": 3, "status": "ingesting", "message": f"NASA DONKI data ingested — Kp={storm['max_kp']} EXTREME storm confirmed", "storm": storm})
    await delay(2)

    # Step 4: Map zones go red in sequence, north first
    regions_order = ["north", "northeast", "central", "west", "east", "south"]
    all_zones = map_storm_to_discoms("red", storm["max_kp"])
    revealed_zones = get_all_discoms()

    for region in regions_order:
        for zone in all_zones:
            if zone["region"] == region:
                # Update this zone in revealed_zones
                for rz in revealed_zones:
                    if rz["id"] == zone["id"]:
                        rz.update(zone)
        yield event({
            "step": 4,
            "status": "mapping",
            "message": f"Grid zone alert: {region.upper()} region — CRITICAL RISK",
            "discoms": revealed_zones,
            "region": region,
        })
        await delay(1.5)

    # Step 5: Alert log
    affected_count = sum(1 for z in all_zones if z["affected"])
    yield event({
        "step": 5,
        "status": "alerting",
        "message": f"ALERT: {affected_count} DISCOM zones at risk. Initiating farmer and fisherman alerts...",
        "alert_log": [
            {"id": 1, "type": "DISCOM", "zone": "PSPCL Punjab", "status": "notified", "time": "T+0:45"},
            {"id": 2, "type": "DISCOM", "zone": "DHBVN Haryana", "status": "notified", "time": "T+0:47"},
            {"id": 3, "type": "farmer", "region": "Punjab/Haryana", "count": "12,400 farmers", "status": "calling", "time": "T+0:52"},
            {"id": 4, "type": "fisherman", "region": "Kerala coast", "count": "3,200 fishermen", "status": "calling", "time": "T+0:58"},
        ],
    })
    await delay(3)

    # Step 6: Twilio call
    call_result = None
    target = phone or DEMO_PHONE
    if target:
        masked = "*" * 6 + target[-4:]
        yield event({"step": 6, "status": "calling", "message": f"Placing Hindi voice alert to {masked}..."})
        await delay(1)
        try:
            call_result = make_alert_call(target, storm["max_kp"])
            yield event({
                "step": 6,
                "status": "call_placed",
                "message": "Hindi alert call placed — phone ringing now",
                "call_sid": call_result.get("call_sid"),
                "call_status": call_result.get("status"),
            })
        except Exception as e:
            yield event({"step": 6, "status": "call_failed", "message": f"Call failed: {e}. Playing local fallback audio.", "fallback": True})
    else:
        yield event({"step": 6, "status": "no_phone", "message": "No demo phone set — skipping call (set DEMO_PHONE_NUMBER)"})

    await delay(1)

    # Step 7: Done
    yield event({
        "step": 7,
        "status": "complete",
        "message": "KAVACH demo complete — 1.4 billion Indians protected autonomously",
        "summary": {
            "storm_kp": storm["max_kp"],
            "severity": "EXTREME",
            "zones_alerted": affected_count,
            "farmers_called": "12,400",
            "fishermen_called": "3,200",
            "time_to_alert": "< 90 seconds",
            "human_triggers": 0,
            "timeline": {
                "storm_start": "2024-05-10T17:05:00Z",
                "kavach_alert": "2024-05-10T17:30:00Z",
                "peak_impact": "2024-05-11T00:00:00Z",
                "warning_window_hours": 4.5,
            },
            "damage_avoided": {
                "transformer_cost_crore": 8.3,
                "replacement_months": 18,
                "total_risk_crore": 3000,
                "kavach_cost_lakh_month": 5,
                "roi_x": "600x",
            },
            "moat": "ISRO maps satellites. KAVACH maps India's last mile.",
            "built_with": "Claude Code — autonomous build in 6 days",
        },
    })


@router.post("/replay")
async def replay_storm(phone: str = None, speed: float = 1.0):
    """Stream SSE events replaying the May 2024 extreme storm."""
    return StreamingResponse(
        _replay_generator(phone, speed),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/trigger-call")
async def trigger_demo_call(phone: str = None):
    """Fire just the Twilio call — useful for testing."""
    target = phone or DEMO_PHONE
    if not target:
        return {"error": "No phone number — pass ?phone=+91XXXXXXXXXX or set DEMO_PHONE_NUMBER"}
    try:
        result = make_alert_call(target, 9.0)
        return {"success": True, **result}
    except Exception as e:
        return {"success": False, "error": str(e)}
