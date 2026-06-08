"""
Polls NOAA SWPC for real-time Kp-index every 5 minutes.
"""
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
            latest = data[-1]
            kp = float(latest[1]) if latest[1] else 0
            return {"kp": kp, "time": latest[0], "source": "NOAA", "status": "ok"}
    except Exception as e:
        logger.error(f"NOAA poll failed: {e}")
        return {"kp": 0, "source": "NOAA", "status": "error", "error": str(e)}
