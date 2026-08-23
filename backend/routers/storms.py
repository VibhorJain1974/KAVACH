from datetime import datetime, timezone
from fastapi import APIRouter
from services.nasa import fetch_gst_events, parse_gst_events, fetch_cme_events
from services.fallback_cache import fetch_with_fallback_async
from agents.noaa_agent import fetch_current_kp
import os

router = APIRouter(prefix="/storm", tags=["storms"])


@router.get("/current")
async def get_current_storm():
    """Live Kp-index from NOAA."""
    return await fetch_current_kp()


@router.get("/live-now")
async def get_live_now():
    """
    Genuinely real-time Kp-index — pulled fresh on every call (not the
    May 2024 replay dataset). Cached with an offline fallback so a NOAA
    outage never breaks the pre-demo opener, but the timestamp always
    reflects when THIS request actually ran.
    """
    result = await fetch_with_fallback_async("live_kp", fetch_current_kp)
    data = result["data"] or {"kp": 0, "source": "NOAA", "status": "unavailable"}
    return {
        **data,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "data_freshness": result["source"],  # "live" | "cache" | "fixture" | "none"
    }


@router.get("/history")
async def get_storm_history(days: int = 7):
    from datetime import datetime, timedelta
    end = datetime.utcnow()
    start = end - timedelta(days=days)
    raw = await fetch_gst_events(start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
    return parse_gst_events(raw)


@router.get("/may2024")
async def get_may2024_storm():
    """Returns the saved May 2024 extreme storm data."""
    from services.nasa import load_may2024_storm, parse_gst_events
    raw = load_may2024_storm()
    return parse_gst_events(raw)
