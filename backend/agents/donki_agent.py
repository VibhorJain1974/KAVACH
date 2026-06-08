"""
Polls NASA DONKI for new geomagnetic storm events every 15 minutes.
On new red/yellow storms, triggers alert pipeline.
"""
import logging
from datetime import datetime, timedelta
from services.nasa import fetch_gst_events, parse_gst_events, classify_severity
from services.discom_mapper import map_storm_to_discoms

logger = logging.getLogger(__name__)

_last_seen_ids: set[str] = set()


async def poll_donki(supabase_client=None):
    end = datetime.utcnow()
    start = end - timedelta(days=3)
    try:
        raw = await fetch_gst_events(start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
        events = parse_gst_events(raw)
        new_events = [e for e in events if e["gst_id"] not in _last_seen_ids]

        for event in new_events:
            _last_seen_ids.add(event["gst_id"])
            logger.info(f"New storm: {event['gst_id']} Kp={event['max_kp']} severity={event['severity']}")
            if supabase_client and event["severity"] in ("red", "yellow"):
                await _store_storm(supabase_client, event)

        return new_events
    except Exception as e:
        logger.error(f"DONKI poll failed: {e}")
        return []


async def _store_storm(client, event: dict):
    try:
        client.table("storm_events").upsert({
            "gst_id": event["gst_id"],
            "start_time": event["start_time"],
            "max_kp": event["max_kp"],
            "severity": event["severity"],
            "kp_readings": event["kp_readings"],
            "source": "NASA_DONKI",
        }).execute()
    except Exception as e:
        logger.error(f"Failed to store storm: {e}")
