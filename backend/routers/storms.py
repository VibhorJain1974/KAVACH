from fastapi import APIRouter
from services.nasa import fetch_gst_events, parse_gst_events, fetch_cme_events
from agents.noaa_agent import fetch_current_kp
import os

router = APIRouter(prefix="/storm", tags=["storms"])


@router.get("/current")
async def get_current_storm():
    """Live Kp-index from NOAA."""
    return await fetch_current_kp()


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
