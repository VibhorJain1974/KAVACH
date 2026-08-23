"""
Dispatches alerts: stores to Supabase, triggers Twilio calls.
"""
import logging
import os
from datetime import datetime, timedelta, timezone
from agents.noaa_agent import fetch_current_kp
from services.nasa import classify_severity
from services.twilio_caller import make_alert_call
from services.discom_mapper import map_storm_to_discoms

logger = logging.getLogger(__name__)

DEMO_PHONE = os.getenv("DEMO_PHONE_NUMBER", "")

STORM_ALERT_THRESHOLD_KP = float(os.getenv("STORM_ALERT_THRESHOLD_KP", "5.0"))

# How long a single Kp-threshold crossing stays "already alerted" before a
# repeat crossing is allowed to fire again. A real storm can sit above
# threshold for hours across many 5-min poll cycles; without this, every
# cycle would place another real call. 6h comfortably outlasts a normal
# storm's above-threshold window while still resetting well before the
# next one could plausibly start.
KP_THRESHOLD_COOLDOWN_HOURS = 6
KP_THRESHOLD_SOURCE = "NOAA_KP_THRESHOLD"

# Severity ranking so a genuine escalation (yellow -> red) can bypass an
# active cooldown — that's materially new information worth a fresh call —
# while a same-or-lower severity repeat during the cooldown stays suppressed.
_SEVERITY_RANK = {"green": 0, "yellow": 1, "red": 2}


async def dispatch_alerts(storm: dict, supabase_client=None, call_phone: str = None) -> dict:
    severity = storm.get("severity", "green")
    max_kp = storm.get("max_kp", 0)
    gst_id = storm.get("gst_id", "unknown")

    zones = map_storm_to_discoms(severity, max_kp)
    affected = [z["id"] for z in zones if z["affected"]]

    alert = {
        "storm_id": gst_id,
        "alert_type": "full",
        "severity": severity,
        "message": f"Solar storm Kp={max_kp:.1f} affecting {len(affected)} DISCOM zones",
        "affected_zones": affected,
        "call_status": "pending",
    }

    if supabase_client:
        try:
            res = supabase_client.table("alert_log").insert(alert).execute()
            alert["id"] = res.data[0]["id"] if res.data else None
        except Exception as e:
            logger.error(f"Alert insert failed: {e}")

    call_result = None
    phone = call_phone or (DEMO_PHONE if severity == "red" else None)
    if phone and severity in ("red", "yellow"):
        try:
            call_result = make_alert_call(phone, max_kp)
            logger.info(f"Call placed: {call_result}")
            if supabase_client and alert.get("id"):
                supabase_client.table("alert_log").update(
                    {"call_status": "called", "call_sid": call_result.get("call_sid")}
                ).eq("id", alert["id"]).execute()
        except Exception as e:
            logger.error(f"Twilio call failed: {e}")
            call_result = {"error": str(e), "status": "failed"}

    return {"alert": alert, "zones": zones, "call_result": call_result}


async def check_kp_threshold_and_alert(supabase_client=None, call_phone: str = None) -> dict:
    """Scheduled every 5 min alongside the raw NOAA poll. Compares the live
    Kp value against STORM_ALERT_THRESHOLD_KP and, on a genuine new
    crossing, dispatches a real alert + call — this is the only place that
    turns live detection into unattended action.

    Safety: requires a working supabase_client to fire at all (it's the only
    cooldown record we have) and fails CLOSED — any error while checking the
    cooldown suppresses the alert rather than risking a duplicate call.
    """
    result = await fetch_current_kp()
    kp = result.get("kp", 0)
    severity = classify_severity(kp)

    if kp < STORM_ALERT_THRESHOLD_KP:
        return {"kp": kp, "severity": severity, "action": "none_below_threshold"}

    if not supabase_client:
        logger.warning(
            f"[kp_threshold] Kp={kp} >= threshold but no supabase_client — "
            "cannot enforce cooldown, refusing to auto-dispatch to avoid repeat calls"
        )
        return {"kp": kp, "severity": severity, "action": "suppressed_no_supabase"}

    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=KP_THRESHOLD_COOLDOWN_HOURS)).isoformat()
        recent = (
            supabase_client.table("storm_events")
            .select("severity, created_at")
            .eq("source", KP_THRESHOLD_SOURCE)
            .gte("created_at", cutoff)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
            .data
        )
    except Exception as e:
        logger.error(f"[kp_threshold] cooldown check failed, not alerting to be safe: {e}")
        return {"kp": kp, "severity": severity, "action": "suppressed_cooldown_check_failed"}

    if recent:
        last_severity = recent[0]["severity"]
        if _SEVERITY_RANK.get(severity, 0) <= _SEVERITY_RANK.get(last_severity, 0):
            return {"kp": kp, "severity": severity, "action": "suppressed_cooldown"}
        logger.info(f"[kp_threshold] escalation {last_severity} -> {severity}, bypassing cooldown")

    gst_id = f"KP-THRESHOLD-{result.get('time') or datetime.now(timezone.utc).isoformat()}"
    storm_row = {
        "gst_id": gst_id,
        "start_time": result.get("time") or datetime.now(timezone.utc).isoformat(),
        "max_kp": kp,
        "severity": severity,
        "kp_readings": [{"kp_index": kp, "time_tag": result.get("time")}],
        "source": KP_THRESHOLD_SOURCE,
    }
    try:
        # upsert: two poll ticks landing on the same NOAA time_tag must not
        # produce two storm_events rows (and thus two alert_log FK targets).
        supabase_client.table("storm_events").upsert(storm_row).execute()
    except Exception as e:
        logger.error(f"[kp_threshold] failed to store storm_events row, not alerting: {e}")
        return {"kp": kp, "severity": severity, "action": "suppressed_storm_insert_failed"}

    logger.info(f"[kp_threshold] genuine new crossing: Kp={kp} severity={severity} -> dispatching real alert")
    alert_result = await dispatch_alerts(
        {"gst_id": gst_id, "severity": severity, "max_kp": kp},
        supabase_client=supabase_client,
        call_phone=call_phone,
    )
    return {"kp": kp, "severity": severity, "action": "alert_dispatched", "alert_result": alert_result}
