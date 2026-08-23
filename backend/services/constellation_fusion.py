import httpx
import os
import logging
from dotenv import load_dotenv

from services.fallback_cache import fetch_with_fallback_async

load_dotenv()

logger = logging.getLogger(__name__)

NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
GOES_XRAY_URL = "https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json"
USGS_MAGNETOMETER_URL = "https://geomag.usgs.gov/ws/data/?id=BOU&format=json&type=variation"
DONKI_CME_URL = "https://api.nasa.gov/DONKI/CMEAnalysis"

# Thresholds are simple, documented crossing points — not a trained model.
# Each is chosen from public space-weather severity scales (NOAA G/R scale
# equivalents), so "why did this cross" always has a one-line honest answer.
CME_SPEED_THRESHOLD_KMS = 1000       # NOAA: >1000 km/s CME associated with G3+ storms
XRAY_FLUX_M_CLASS = 1e-05            # NOAA: M-class flare, flux in W/m^2
MAGNETOMETER_DELTA_NT = 300          # nT swing over the observed window — disturbed-field indicator

MISSION_ACKNOWLEDGMENTS = [
    {
        "mission": "JAXA Hinode",
        "agency": "JAXA (Japan)",
        "status": "mission_acknowledgment",
        "note": "No public live-data API exists — solar observation archive only (DARTS), released with delay. Not used as a live input to KAVACH's confidence score.",
    },
    {
        "mission": "ISRO Aditya-L1",
        "agency": "ISRO (India)",
        "status": "mission_acknowledgment",
        "note": "No public live-data API exists — registered-access science portal (PRADAN), 24-48h release delay. Not used as a live input to KAVACH's confidence score.",
    },
    {
        # Checked 2026-07-19 against the live VEDAS API Centre
        # (https://vedas.sac.gov.in/vconsole/). It publishes exactly two APIs:
        # a WMS imagery API (AWiFS/Sentinel-2 FCC/TCC) and a Temporal NDVI
        # time-series API — both Earth-observation, both behind registration
        # and an API key. There is NO ionospheric / scintillation / TEC /
        # space-weather endpoint. README listed "ISRO VEDAS — ionospheric
        # scintillation" as a Round 2 item; it stays a roadmap target rather
        # than being faked as a live feed.
        "mission": "ISRO VEDAS",
        "agency": "ISRO SAC (India)",
        "status": "future_integration_target",
        "note": "VEDAS publishes only Earth-observation APIs (WMS imagery, NDVI time-series), both key-gated. No ionospheric/scintillation endpoint exists as of 2026-07-19. Listed as a future integration target — not a live input to KAVACH's confidence score.",
    },
]


async def _fetch_cme() -> list[dict]:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(DONKI_CME_URL, params={"api_key": NASA_API_KEY})
        r.raise_for_status()
        return r.json()


async def _fetch_goes_xray() -> list[dict]:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(GOES_XRAY_URL)
        r.raise_for_status()
        return r.json()


async def _fetch_usgs_magnetometer() -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(USGS_MAGNETOMETER_URL)
        r.raise_for_status()
        return r.json()


def _max_cme_speed(cme_data: list[dict]) -> float | None:
    speeds = []
    for event in cme_data or []:
        for analysis in event.get("cmeAnalyses") or []:
            speed = analysis.get("speed")
            if speed is not None:
                speeds.append(speed)
    return max(speeds) if speeds else None


def _max_xray_flux(xray_data: list[dict]) -> float | None:
    fluxes = [r.get("flux") for r in (xray_data or []) if r.get("flux") is not None]
    return max(fluxes) if fluxes else None


def _magnetometer_delta(usgs_data: dict) -> float | None:
    try:
        series = usgs_data["values"][0]["values"]
        clean = [v for v in series if v is not None]
        if len(clean) < 2:
            return None
        return abs(max(clean) - min(clean))
    except (KeyError, IndexError, TypeError):
        return None


async def _killed_fetch():
    """Fetch fn substituted when an operator 'kills' a feed in the demo layer.
    Raising routes through the REAL cache->fixture fallback (fallback_cache), so
    a kill demonstrates genuine resilience rather than faking a drop."""
    raise ConnectionError("demo: live feed killed by operator (display layer only)")


async def get_fusion_status() -> dict:
    """
    Fuses four independently-sourced public signals into one confidence score:
    three government instruments (DONKI/GOES/USGS — 'is a storm coming?') plus the
    HamSCI/WSPR ionosphere witness ('has the sky already broken?'). Each fetch is
    cached with an offline/fixture fallback so a single dead feed never blocks.

    Confidence is derived from LIVE signals only: (live signals crossed) / (live
    signals available). A source on cache/fixture — whether it failed for real or
    was 'killed' in the demo layer — is honestly excluded from live confidence,
    which is what lets the score visibly re-derive when a feed is killed. If no
    live source remains, confidence is 0 with insufficient_live_sources=True
    rather than an invented number.

    Kills are read from demo_feed_state (DISPLAY ONLY) — the autonomous
    storm-detection path never consults it, so this cannot disable real monitoring.
    """
    from services import demo_feed_state
    from services.ionosphere_witness import get_ionosphere_signal

    killed = demo_feed_state.killed_set()

    def _fn(key, live_fn):
        return _killed_fetch if key in killed else live_fn

    cme_result = await fetch_with_fallback_async("donki_cme", _fn("donki_cme", _fetch_cme))
    xray_result = await fetch_with_fallback_async("goes_xray", _fn("goes_xray", _fetch_goes_xray))
    mag_result = await fetch_with_fallback_async("usgs_magnetometer", _fn("usgs_magnetometer", _fetch_usgs_magnetometer))

    cme_speed = _max_cme_speed(cme_result["data"]) if cme_result["data"] else None
    xray_flux = _max_xray_flux(xray_result["data"]) if xray_result["data"] else None
    mag_delta = _magnetometer_delta(mag_result["data"]) if mag_result["data"] else None

    signals = [
        {
            "key": "donki_cme",
            "source": "NASA DONKI (CME analysis)",
            "signal_type": "forecast",
            "metric": "cme_speed_kms",
            "value": cme_speed,
            "threshold": CME_SPEED_THRESHOLD_KMS,
            "crossed": cme_speed is not None and cme_speed >= CME_SPEED_THRESHOLD_KMS,
            "data_freshness": cme_result["source"],
        },
        {
            "key": "goes_xray",
            "source": "NOAA GOES (X-ray flux)",
            "signal_type": "forecast",
            "metric": "xray_flux_wm2",
            "value": xray_flux,
            "threshold": XRAY_FLUX_M_CLASS,
            "crossed": xray_flux is not None and xray_flux >= XRAY_FLUX_M_CLASS,
            "data_freshness": xray_result["source"],
        },
        {
            "key": "usgs_magnetometer",
            "source": "USGS (ground magnetometer, Boulder)",
            "signal_type": "forecast",
            "metric": "field_delta_nt",
            "value": mag_delta,
            "threshold": MAGNETOMETER_DELTA_NT,
            "crossed": mag_delta is not None and mag_delta >= MAGNETOMETER_DELTA_NT,
            "data_freshness": mag_result["source"],
        },
        await get_ionosphere_signal(killed="wspr_ionosphere" in killed),
    ]

    for s in signals:
        s["killed"] = s["key"] in killed
        s["live"] = (s["data_freshness"] == "live") and not s["killed"]

    live_signals = [s for s in signals if s["live"]]
    live_total = len(live_signals)
    live_crossed = sum(1 for s in live_signals if s["crossed"])
    confidence_pct = round((live_crossed / live_total) * 100) if live_total else 0
    insufficient = live_total == 0

    method_note = (
        f"Confidence = live signals crossed / live signals available. "
        f"{live_crossed} of {live_total} LIVE independent sources crossed their documented "
        f"severity threshold. Sources on cache/fixture (failed or killed) are excluded from "
        f"live confidence. Not a trained model — no weights to justify."
        if not insufficient else
        "0% — insufficient live sources. Every independent feed is offline or killed, so "
        "KAVACH will not invent a confidence number."
    )

    return {
        "confidence_pct": confidence_pct,
        "signals_crossed": live_crossed,
        "signals_total": live_total,
        "insufficient_live_sources": insufficient,
        "scoring_method": "live_threshold_crossing_count",
        "explainability": {
            "signals": signals,
            "method_note": method_note,
        },
        "mission_acknowledgments": MISSION_ACKNOWLEDGMENTS,
    }
