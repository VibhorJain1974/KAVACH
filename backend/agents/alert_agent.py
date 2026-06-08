"""
Dispatches alerts: stores to Supabase, triggers Twilio calls.
"""
import logging
import os
from services.twilio_caller import make_alert_call
from services.discom_mapper import map_storm_to_discoms

logger = logging.getLogger(__name__)

DEMO_PHONE = os.getenv("DEMO_PHONE_NUMBER", "")


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
