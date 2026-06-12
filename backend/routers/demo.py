# Demo replay — SSE stream replaying the May 2024 G5 storm, ≤90s sequence.
import asyncio
import json
import os
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from dotenv import dotenv_values
from twilio.rest import Client as TwilioClient
from services.nasa import load_may2024_storm, parse_gst_events, classify_severity
from services.discom_mapper import map_storm_to_discoms, get_all_discoms
from services.twilio_caller import make_alert_call, call_multiple
from services.aurora_predictor import get_active_aurora_locations
from services.storm_memory import get_memory_totals

router = APIRouter(prefix="/demo", tags=["demo"])


def _get_demo_phones() -> list[str]:
    # Re-read .env on every call so number changes take effect without restart
    raw = dotenv_values().get("DEMO_PHONE_NUMBER") or os.getenv("DEMO_PHONE_NUMBER", "")
    return [p.strip() for p in raw.split(",") if p.strip()]


async def _replay_generator(phones: list[str] = None, speed: float = 1.0):
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

    # Step 6: Twilio calls — fire all numbers simultaneously
    targets = phones or _get_demo_phones()
    if targets:
        masked = ", ".join("*" * 6 + n[-4:] for n in targets)
        yield event({"step": 6, "status": "calling", "message": f"Placing Hindi voice alert to {len(targets)} number(s): {masked}..."})
        await delay(1)
        loop = asyncio.get_event_loop()
        call_results = await loop.run_in_executor(None, call_multiple, targets, storm["max_kp"])
        placed = [r for r in call_results if r.get("call_sid")]
        yield event({
            "step": 6,
            "status": "call_placed",
            "message": f"Hindi alert calls placed — {len(placed)}/{len(targets)} phones ringing now",
            "calls": call_results,
        })
    else:
        yield event({"step": 6, "status": "no_phone", "message": "No demo phone set — skipping call (set DEMO_PHONE_NUMBER)"})

    await delay(1)

    # Step 6b: Aurora alert fires for Ladakh (NEW)
    aurora_locations = get_active_aurora_locations(storm["max_kp"])
    if aurora_locations:
        top = aurora_locations[0]
        yield event({
            "step": 6,
            "status": "aurora_alert",
            "message": f"KAVACH aurora alert: {top['name']} — Northern Lights dikhne ki sambhavana hai. Kp={storm['max_kp']}",
            "aurora": {
                "active": True,
                "location": top["name"],
                "kp": storm["max_kp"],
                "probability_pct": top["probability_pct"],
                "hindi_message": f"Aaj raat {top['name']} se Northern Lights dikhne ki sambhavana hai. Kp index: {storm['max_kp']}.",
            },
        })
        await delay(3)

    # Step 8: Daily Shield score drops 95 → 12 (NEW)
    yield event({
        "step": 8,
        "status": "shield_update",
        "message": "KAVACH Daily Shield: Space Weather Score drops 95 → 12. EXTREME storm conditions.",
        "shield": {
            "score_before": 95,
            "score_after": 12,
            "label": "EXTREME — G5 EVENT",
            "color": "#ff4444",
        },
    })
    await delay(2)

    # Step 9: Memory counter increments (NEW)
    memory = get_memory_totals()
    yield event({
        "step": 9,
        "status": "memory_update",
        "message": f"KAVACH Memory: {memory['total_alerts']} alerts fired across {memory['total_storms']} storms since 2003. Protecting India every cycle.",
        "memory": {
            "total_alerts": memory["total_alerts"],
            "total_storms": memory["total_storms"],
            "total_subscribers": memory["total_subscribers_called"],
            "years": memory["years_covered"],
        },
    })
    await delay(3)

    # Step 10: Done
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
async def replay_storm(phones: str = None, speed: float = 1.0):
    """Stream SSE events replaying the May 2024 extreme storm.
    phones: comma-separated list e.g. +919999999999,+918888888888
    """
    phone_list = [p.strip() for p in phones.split(",") if p.strip()] if phones else None
    return StreamingResponse(
        _replay_generator(phone_list, speed),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/trigger-call")
async def trigger_demo_call(phones: str = None):
    """Fire Twilio calls to one or more numbers simultaneously.
    phones: comma-separated e.g. +919999999999,+918888888888
    """
    targets = [p.strip() for p in phones.split(",") if p.strip()] if phones else _get_demo_phones()
    if not targets:
        return {"error": "No phone number — pass ?phones=+91XXX,+91YYY or set DEMO_PHONE_NUMBER"}
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, call_multiple, targets, 9.0)
    return {"success": True, "calls": results, "total": len(results)}


@router.get("/recording")
async def get_recording(call_sid: str):
    """Fetch Twilio recording URL for a call SID. Returns ready=False while call is still in progress."""
    try:
        client = TwilioClient(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
        recordings = client.recordings.list(call_sid=call_sid, limit=1)
        if not recordings:
            return {"ready": False, "call_sid": call_sid}
        rec = recordings[0]
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Recordings/{rec.sid}.mp3"
        return {"ready": True, "url": url, "duration": rec.duration, "sid": rec.sid}
    except Exception as e:
        return {"ready": False, "error": str(e)}
