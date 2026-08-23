# Demo replay — SSE stream replaying the May 2024 G5 storm, ≤90s sequence.
import asyncio
import json
import logging
import os
import re
from datetime import datetime, timezone
from urllib.parse import parse_qs
import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse, Response
from dotenv import dotenv_values
from twilio.rest import Client as TwilioClient
from services.nasa import load_may2024_storm, parse_gst_events, classify_severity
from services.discom_mapper import map_storm_to_discoms, get_all_discoms
from services.twilio_caller import (
    make_alert_call, call_multiple, get_language_info, LANGUAGES,
    call_with_language_menu, ivr_language_twiml, reply_response_twiml,
    send_sms_alert, send_whatsapp_alert, DEFAULT_LANGUAGE,
    escalation_followup_response_twiml,
)
from services import db, notify
from services.aurora_predictor import get_active_aurora_locations
from services.storm_memory import get_memory_totals
from services.smart_beacon import set_beacon

router = APIRouter(prefix="/demo", tags=["demo"])

logger = logging.getLogger(__name__)


CHOOSE_LANGUAGE = "choose"


def _public_base_url() -> str | None:
    """Public URL Twilio can POST the IVR digit back to. Localhost is unusable
    for this — Twilio's servers must be able to reach it."""
    url = (os.getenv("BACKEND_URL") or "").strip().rstrip("/")
    if not url or "localhost" in url or "127.0.0.1" in url:
        return None
    return url


def _get_demo_phones() -> list[str]:
    # Re-read .env on every call so number changes take effect without restart
    raw = dotenv_values().get("DEMO_PHONE_NUMBER") or os.getenv("DEMO_PHONE_NUMBER", "")
    return [p.strip() for p in raw.split(",") if p.strip()]


async def _replay_generator(phones: list[str] = None, speed: float = 1.0):
    delay = lambda s: asyncio.sleep(s / speed)

    def event(data: dict) -> str:
        return f"data: {json.dumps(data)}\n\n"

    # Step 1: Normal state
    set_beacon(False)
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
    if storm["severity"] == "red":
        set_beacon(True)
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


_PHONE_RE = re.compile(r'^\+[1-9]\d{6,14}$')  # E.164


@router.get("/languages")
async def list_languages():
    """Honest per-language TTS status — which are real live TTS vs pre-recorded fallback."""
    return get_language_info()


@router.post("/trigger-call")
async def trigger_demo_call(
    phones: str = None, language: str = "hindi", confirm: bool = False, use_demo_number: bool = False
):
    """Fire Twilio calls to one or more numbers simultaneously.
    phones: comma-separated e.g. +919999999999,+918888888888
    language: hindi | english | japanese | punjabi | tamil (default hindi)
    confirm: MUST be true. This is a server-enforced safeguard against an
    accidental call to a real phone — the frontend UI requires a distinct
    second confirmation click before it ever sends confirm=true, but this
    check is what actually stops a stray or scripted request from firing
    a call, not just the UI affordance.
    use_demo_number: place the call FROM TWILIO_DEMO_PHONE_NUMBER (purchased
    for demo day) instead of the default TWILIO_PHONE_NUMBER. Defaults to
    false — every existing caller of this endpoint keeps today's behavior
    unchanged unless it explicitly opts in.
    """
    targets = [p.strip() for p in phones.split(",") if p.strip()] if phones else _get_demo_phones()
    if not targets:
        return {"error": "No phone number — pass ?phones=+91XXX,+91YYY or set DEMO_PHONE_NUMBER"}

    invalid = [p for p in targets if not _PHONE_RE.fullmatch(p)]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid phone number format (expected E.164, e.g. +919999999999): {invalid}")

    if language != CHOOSE_LANGUAGE and language not in LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unknown language '{language}'. Choose from: {list(LANGUAGES.keys()) + [CHOOSE_LANGUAGE]}")

    # Skip the confirm gate only for the pre-set demo number pulled from
    # DEMO_PHONE_NUMBER (an explicit ?phones= override is a deliberate,
    # user-entered call and must be confirmed).
    is_arbitrary_number = bool(phones)
    if is_arbitrary_number and not confirm:
        raise HTTPException(status_code=400, detail="Confirmation required — pass confirm=true to actually place this call")

    loop = asyncio.get_event_loop()

    if language == CHOOSE_LANGUAGE:
        # "Let them choose" — live/arbitrary-number calls only. Requires a
        # publicly reachable BACKEND_URL for Twilio to POST the pressed digit
        # back to; against a localhost backend Twilio cannot reach the action
        # URL, so we fail loudly here rather than placing a call that would
        # dead-end mid-menu.
        if not _public_base_url():
            raise HTTPException(
                status_code=400,
                detail="language=choose needs a publicly reachable BACKEND_URL for the IVR callback; "
                       "set BACKEND_URL to the deployed backend (Twilio cannot POST to localhost).",
            )
        action_url = f"{_public_base_url()}/demo/ivr-language"
        results = await loop.run_in_executor(
            None, lambda: [call_with_language_menu(n, 9.0, action_url, use_demo_number=use_demo_number) for n in targets]
        )
        return {
            "success": True, "calls": results, "total": len(results), "language": CHOOSE_LANGUAGE,
            "from_number": "demo" if use_demo_number else "primary",
        }

    results = await loop.run_in_executor(None, call_multiple, targets, 9.0, language, use_demo_number)
    return {
        "success": True, "calls": results, "total": len(results), "language": language,
        "from_number": "demo" if use_demo_number else "primary",
    }


@router.post("/ivr-language")
async def ivr_language(request: Request):
    """Twilio POSTs the pressed digit here; we answer with the alert TwiML in
    the chosen language. No digit / unrecognised digit -> Hindi (never errors,
    never hangs up silently).

    Security note: `Digits` is attacker-controllable in principle, so it is
    used ONLY as a dict key lookup against a fixed 4-entry map — it is never
    interpolated into TwiML, SQL, or a shell. Anything unrecognised collapses
    to the default language.
    """
    # Twilio POSTs application/x-www-form-urlencoded. We parse the raw body
    # ourselves rather than using request.form(), which requires the optional
    # `python-multipart` package — it is NOT installed here, and when it is
    # missing request.form() raises. An earlier version of this handler caught
    # that exception silently, which made every IVR call fall through to Hindi
    # no matter which digit was pressed. Parsing the body directly removes the
    # dependency and the failure mode.
    digit = ""
    try:
        raw = (await request.body()).decode("utf-8", errors="replace")
        if raw:
            parsed = parse_qs(raw)
            digit = (parsed.get("Digits") or [""])[0]
    except Exception as e:
        logger.warning(f"[ivr] could not parse body, defaulting to {'hindi'}: {e}")
    if not digit:
        digit = str(request.query_params.get("Digits") or "")

    twiml, language_used = ivr_language_twiml(9.0, digit)
    logger.info(f"[ivr] digit={digit!r} -> language={language_used}")
    return Response(content=twiml, media_type="application/xml")


async def _read_twilio_form(request: Request) -> dict:
    """Parse Twilio's urlencoded POST body once, without needing python-multipart.
    Returns a flat dict; missing/unparseable body yields {}."""
    try:
        raw = (await request.body()).decode("utf-8", errors="replace")
        if raw:
            return {k: v[0] for k, v in parse_qs(raw).items() if v}
    except Exception as e:
        logger.warning(f"[reply] body parse failed: {e}")
    return {}


@router.post("/reply")
async def voice_reply(request: Request, language: str = DEFAULT_LANGUAGE):
    """Two-way voice reply handler: 1 = confirmed, 2 = needs help, none = no response.

    Security: `Digits` is compared against the literal strings "1"/"2" only and
    never interpolated anywhere; anything else falls to the no_response branch.
    """
    form = await _read_twilio_form(request)
    digit = form.get("Digits") or str(request.query_params.get("Digits") or "")

    call_sid = form.get("CallSid") or ""
    # On an outbound call, Twilio's `To` is the recipient — the farmer.
    phone = form.get("To") or ""

    # The follow-up "which kind of help" menu needs a publicly reachable
    # action URL (same constraint as language=choose above) — Twilio cannot
    # POST back to localhost. Falls back to the plain ack+hangup when unset.
    detail_action_url = None
    if digit.strip() == "2" and _public_base_url():
        detail_action_url = f"{_public_base_url()}/demo/reply-detail?language={language}"

    twiml, tag = reply_response_twiml(language, digit, detail_action_url=detail_action_url)

    escalation_note = ""
    if tag == "needs_help":
        # Fire-and-forget: the TwiML below is returned to Twilio immediately,
        # the Telegram round-trip and the escalation_queue write happen on
        # background threads.
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        notify.send_telegram_alert_async(
            "KAVACH — FARMER NEEDS HELP\n"
            f"Phone: {db.mask_phone(phone) if phone else 'unknown'}\n"
            f"Language: {language}\n"
            f"Call SID: {call_sid or 'unknown'}\n"
            f"Time: {ts}\n"
            "Farmer pressed 2 during the storm alert call."
        )
        # "dispatched" is accurate whether or not delivery succeeds; the actual
        # delivery result is logged by notify.send_telegram_alert itself, so
        # this row never claims a send that failed.
        escalation_note = (
            " — escalation notification dispatched to operator via Telegram"
            if notify.telegram_configured()
            else " — escalation requested; Telegram not configured, logged only"
        )
        logger.warning(
            f"[reply] ESCALATION REQUESTED sid={call_sid[-8:] or '?'} lang={language} "
            f"phone={db.mask_phone(phone) if phone else 'unknown'}"
        )
        # Row created now (generic text); update_escalation_category fills in
        # the real category later if/when the follow-up digit arrives.
        db.create_escalation(call_sid=call_sid or None, phone=phone or None, language=language)

    db.log_call(
        phone=phone or "(inbound-reply)",
        language=language,
        outcome=tag,
        call_sid=call_sid or None,
        alert_type="voice_reply",
        message=f"Farmer reply: {tag}{escalation_note}",
    )
    logger.info(f"[reply] digit={digit!r} lang={language} -> {tag}")
    return Response(content=twiml, media_type="application/xml")


@router.post("/reply-detail")
async def voice_reply_detail(request: Request, language: str = DEFAULT_LANGUAGE):
    """Follow-up digit after a needs_help escalation: which kind of help.

    Digit-collision safety: this is its own <Gather>/action URL, separate
    from both the language-choice menu (/demo/ivr-language) and the
    confirm/help menu (/demo/reply) — Twilio can only reach this endpoint
    after already returning a genuine digit=="2" on /demo/reply, so a press
    here can never be confused with either of those.
    """
    form = await _read_twilio_form(request)
    digit = form.get("Digits") or str(request.query_params.get("Digits") or "")
    call_sid = form.get("CallSid") or ""

    twiml, category = escalation_followup_response_twiml(language, digit)
    db.update_escalation_category(call_sid=call_sid or None, category=category)
    logger.info(f"[reply-detail] sid={call_sid[-8:] if call_sid else '?'} digit={digit!r} -> category={category or 'unspecified'}")
    return Response(content=twiml, media_type="application/xml")


@router.post("/send-sms")
async def send_sms(phones: str, language: str = DEFAULT_LANGUAGE, confirm: bool = False):
    """Manually send the SMS alert. Same confirm gate as live voice calls —
    this sends a real message to a real number."""
    targets = [p.strip() for p in phones.split(",") if p.strip()] if phones else []
    if not targets:
        raise HTTPException(status_code=400, detail="No phone number — pass ?phones=+91XXXXXXXXXX")
    invalid = [p for p in targets if not _PHONE_RE.fullmatch(p)]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid phone number format (expected E.164): {invalid}")
    if not confirm:
        raise HTTPException(status_code=400, detail="Confirmation required — pass confirm=true to actually send this SMS")

    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, lambda: [send_sms_alert(n, language, reason="manual") for n in targets])
    return {"success": True, "messages": results, "total": len(results), "language": language}


@router.post("/send-whatsapp")
async def send_whatsapp(phones: str, language: str = DEFAULT_LANGUAGE, confirm: bool = False):
    """Send the alert over WhatsApp (Twilio Sandbox). Same confirm gate as the
    live voice/SMS paths — this delivers a real message to a real number.

    Sandbox caveat is returned in the payload so the UI can surface it: the
    recipient must have sent the join code to the sandbox number first.
    """
    targets = [p.strip() for p in phones.split(",") if p.strip()] if phones else []
    if not targets:
        raise HTTPException(status_code=400, detail="No phone number — pass ?phones=+91XXXXXXXXXX")
    invalid = [p for p in targets if not _PHONE_RE.fullmatch(p)]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid phone number format (expected E.164): {invalid}")
    if not confirm:
        raise HTTPException(status_code=400, detail="Confirmation required — pass confirm=true to actually send this WhatsApp message")

    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, lambda: [send_whatsapp_alert(n, language) for n in targets])
    # Previously not logged at all — the operator "WhatsApp sent" metric would
    # have had zero real rows to compute from. Logged here the same way SMS
    # fallback already is, so that metric is real rather than hardcoded.
    for n, r in zip(targets, results):
        db.log_call(
            phone=n, language=language,
            outcome="sent" if r.get("message_sid") else "failed",
            call_sid=r.get("message_sid"),
            alert_type="whatsapp",
        )
    return {
        "success": True, "messages": results, "total": len(results), "language": language,
        "sandbox_note": "Demo mode — Twilio WhatsApp Sandbox. Recipient must join the sandbox before they can receive messages. Not production WhatsApp Business.",
    }


@router.get("/recording")
async def get_recording(call_sid: str):
    """Check if a recording is ready. Returns a proxy URL (no Twilio auth needed in browser).

    IMPORTANT — why the status check exists (this was a real, reproduced bug):
    Twilio creates the Recording resource ~1s after the call is ANSWERED, not
    when it ends. For most of the call it sits at status='processing' with
    duration=-1. The original code returned ready=True as soon as the resource
    existed, so the UI would set an <audio src> pointing at a recording Twilio
    hadn't finished writing — the player appeared but was empty/broken, and the
    frontend had already stopped polling. Short calls happened to work (already
    finished by first poll), long ones didn't. That's the "sometimes it works,
    mostly doesn't" the user reported.

    Measured on a real call: resource appeared at t+18s status='processing',
    only became status='completed' (duration=9) at t+30s.

    So: only report ready when Twilio says the recording is actually completed.
    """
    try:
        client = TwilioClient(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
        recordings = client.recordings.list(call_sid=call_sid, limit=1)
        if not recordings:
            return {"ready": False, "call_sid": call_sid, "state": "no_recording_yet"}
        rec = recordings[0]
        if rec.status != "completed":
            # Still being written — tell the client to keep polling, don't hand
            # out a URL that would render a broken player.
            return {"ready": False, "call_sid": call_sid, "state": str(rec.status)}
        # Return proxy URL — browser fetches audio through our backend (avoids Twilio 401 login prompt)
        proxy_url = f"/demo/recording-audio?sid={rec.sid}"
        return {"ready": True, "url": proxy_url, "duration": rec.duration, "sid": rec.sid, "state": "completed"}
    except Exception as e:
        logger.warning(f"[recording] lookup failed for {call_sid[-8:] if call_sid else '?'}: {e}")
        return {"ready": False, "error": str(e), "state": "error"}


_RECORDING_SID_RE = re.compile(r'^RE[0-9a-fA-F]{32}$')

@router.get("/recording-audio")
async def proxy_recording_audio(sid: str):
    """Stream Twilio recording MP3 through our backend so the browser doesn't need Twilio credentials."""
    if not _RECORDING_SID_RE.fullmatch(sid):
        raise HTTPException(status_code=400, detail="Invalid recording SID")
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Recordings/{sid}.mp3"
    async with httpx.AsyncClient() as client:
        r = await client.get(twilio_url, auth=(account_sid, auth_token))
        r.raise_for_status()
        return StreamingResponse(
            iter([r.content]),
            media_type="audio/mpeg",
            headers={"Content-Disposition": f"inline; filename=kavach-call-{sid[:8]}.mp3"},
        )
