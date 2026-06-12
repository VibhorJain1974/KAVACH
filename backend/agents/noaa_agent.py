# Polls NOAA SWPC for real-time Kp-index every 5 minutes.
import httpx
import logging
import os
from dotenv import load_dotenv

load_dotenv()

NOAA_KP_URL = os.getenv("NOAA_KP_URL", "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json")
logger = logging.getLogger(__name__)


async def fetch_current_kp() -> dict:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(NOAA_KP_URL)
            r.raise_for_status()
            data = r.json()
            if not data:
                return {"kp": 0, "source": "NOAA", "status": "no_data"}
            # Walk backward to skip trailing 0Z placeholders (NOAA emits kp=0 at start of each new 3h window)
            entry = None
            for row in reversed(data):
                if isinstance(row, dict):
                    kp_val = float(row.get("estimated_kp") or row.get("kp_index") or 0)
                else:
                    kp_val = float(row[1]) if row[1] else 0
                if kp_val > 0:
                    entry = row
                    break
            if entry is None:
                entry = data[-1]
            if isinstance(entry, dict):
                kp = float(entry.get("estimated_kp") or entry.get("kp_index") or 0)
                time = entry.get("time_tag", "")
            else:
                kp = float(entry[1]) if entry[1] else 0
                time = entry[0]
            return {"kp": kp, "time": time, "source": "NOAA", "status": "ok"}
    except Exception as e:
        logger.error(f"NOAA poll failed: {e}")
        return {"kp": 0, "source": "NOAA", "status": "error", "error": str(e)}
