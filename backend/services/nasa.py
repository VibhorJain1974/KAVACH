import httpx
import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
DONKI_BASE = "https://api.nasa.gov/DONKI"


async def fetch_gst_events(start_date: str, end_date: str) -> list[dict]:
    url = f"{DONKI_BASE}/GST"
    params = {"startDate": start_date, "endDate": end_date, "api_key": NASA_API_KEY}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        return r.json()


async def fetch_cme_events(start_date: str, end_date: str) -> list[dict]:
    url = f"{DONKI_BASE}/CMEAnalysis"
    params = {"startDate": start_date, "endDate": end_date, "api_key": NASA_API_KEY}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        return r.json()


def load_may2024_storm() -> list[dict]:
    data_path = Path(__file__).parent.parent / "data" / "may2024_storm.json"
    with open(data_path) as f:
        return json.load(f)


def classify_severity(kp: float) -> str:
    if kp >= 7:
        return "red"
    if kp >= 5:
        return "yellow"
    return "green"


def parse_gst_events(raw: list[dict]) -> list[dict]:
    events = []
    for item in raw:
        readings = item.get("allKpIndex", [])
        if not readings:
            continue
        max_kp = max(r["kpIndex"] for r in readings)
        events.append({
            "gst_id": item["gstID"],
            "start_time": item["startTime"],
            "max_kp": max_kp,
            "severity": classify_severity(max_kp),
            "kp_readings": readings,
            "source": "NASA_DONKI",
        })
    return events
