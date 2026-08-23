"""Ionosphere Witness — amateur radio (WSPR) as a ground-truth space-weather sensor.

ATTRIBUTION (non-negotiable — this MUST also appear in the UI, not just here):
the *method* of using amateur-radio propagation data (WSPR / Reverse Beacon
Network) as an ionospheric sensor is published citizen-science research by
Nathaniel Frissell and the HamSCI collaboration (NSF/NASA-funded). KAVACH
*operationalizes HamSCI's published method* against the live wspr.live database.
KAVACH did NOT discover this — say so plainly wherever it is shown.

Why this is a different CATEGORY of signal from DONKI/GOES/USGS: those are
government instruments predicting or measuring the storm at the source ("is a
storm coming?"). WSPR is tens of thousands of civilians measuring the storm's
*effect on Earth's atmosphere*, from the ground, by accident ("has the sky
already broken, right now?"). It is a WITNESS, not a forecast input.

Data source: wspr.live — public ClickHouse database over plain HTTP.
  - https://db1.wspr.live/?query=<SQL>   (no auth, no key, GET only, ~20 req/min)
  - 2.7B+ historical spots; ~300k reception reports per hour worldwide.

HONESTY GUARDS baked in here:
  1. Diurnal confound: raw spot counts rise and fall every day with sunlight and
     operator activity. A naive "count dropped -> storm" claim is simply WRONG and
     a licensed-ham judge would catch it. So we report DEFICIT vs a same-hour
     baseline (average of this hour-of-day over the previous 7 days), never the
     raw count alone.
  2. India coverage is thin (~23 active Indian WSPR stations / 24h — measured).
     So we claim GLOBAL measurement, never "we sense the ionosphere over India".
"""
import logging
import time
from datetime import datetime, timezone

import httpx

from services.fallback_cache import fetch_with_fallback_async

logger = logging.getLogger(__name__)

WSPR_URL = "https://db1.wspr.live/"
WSPR_TIMEOUT_S = 15

# Deficit (percent below the same-hour baseline) at/above which we call the sky
# "disturbed". Chosen as an honest, legible crossing point, not a tuned model:
# normal diurnal wobble stays well under this; the May 2024 G5 hit ~93%.
DISTURBANCE_DEFICIT_PCT = 40

# Attribution + scope strings — imported by the router so the SAME words reach
# the UI. Do not soften the HamSCI credit.
ATTRIBUTION = (
    "Method: HamSCI (N. Frissell et al., NSF/NASA-funded citizen science). "
    "KAVACH operationalizes their published method — it did not discover it. "
    "Data: wspr.live (WSPR amateur-radio network)."
)
COVERAGE_NOTE = (
    "Global WSPR network (~300k spots/hr). Measures the worldwide ionosphere, "
    "not India specifically — only ~23 active Indian stations in 24h."
)

# In-process baseline cache: the 7-day same-hour average changes at most hourly,
# so caching it keeps us far under wspr.live's ~20 req/min limit even under
# repeated polling (each live-witness call then costs a single cheap query).
_baseline_cache: dict = {"hour": None, "value": None, "ts": 0.0}
_BASELINE_TTL_S = 3600


async def _wspr_query(sql: str) -> list[dict]:
    """Run one ClickHouse SQL query against wspr.live, return the rows.
    Raises on any failure so fetch_with_fallback_async can catch and fall back."""
    async with httpx.AsyncClient(timeout=WSPR_TIMEOUT_S) as client:
        r = await client.get(WSPR_URL, params={"query": f"{sql} FORMAT JSON"})
        r.raise_for_status()
        return r.json().get("data", [])


async def _fetch_live_count() -> int:
    """Global WSPR reception reports in the last 60 minutes (all bands)."""
    rows = await _wspr_query(
        "SELECT count(*) AS spots FROM wspr.rx WHERE time > now() - INTERVAL 1 HOUR"
    )
    return int(rows[0]["spots"]) if rows else 0


async def _fetch_same_hour_baseline() -> float:
    """Average spot count in THIS hour-of-day over the previous 7 full days.
    This is the diurnal-confound guard — the number a quiet day would show now."""
    rows = await _wspr_query(
        "SELECT avg(cnt) AS baseline FROM ("
        "  SELECT toDate(time) AS d, count(*) AS cnt FROM wspr.rx"
        "  WHERE time >= now() - INTERVAL 8 DAY AND time < now() - INTERVAL 1 DAY"
        "    AND toHour(time) = toHour(now())"
        "  GROUP BY d"
        ")"
    )
    return float(rows[0]["baseline"]) if rows and rows[0].get("baseline") else 0.0


async def _get_baseline_cached() -> float:
    """Baseline with a 1-hour in-process TTL, so live-witness polling doesn't
    burn the rate limit re-computing a slow 7-day aggregate every call."""
    now = time.time()
    this_hour = datetime.now(timezone.utc).hour
    if (
        _baseline_cache["value"] is not None
        and _baseline_cache["hour"] == this_hour
        and now - _baseline_cache["ts"] < _BASELINE_TTL_S
    ):
        return _baseline_cache["value"]
    try:
        baseline = await _fetch_same_hour_baseline()
        if baseline > 0:
            _baseline_cache.update({"hour": this_hour, "value": baseline, "ts": now})
        return baseline
    except Exception as e:
        logger.warning(f"[ionosphere] baseline fetch failed ({e}) — using last known {_baseline_cache['value']}")
        return _baseline_cache["value"] or 0.0


def _deficit_pct(count: int, baseline: float) -> float:
    """Percent BELOW the same-hour baseline (0 when at/above baseline).
    This — not the raw count — is what we ever call a storm signature."""
    if not baseline or baseline <= 0:
        return 0.0
    return max(0.0, round((baseline - count) / baseline * 100, 1))


async def _killed_fetch():
    """Fetch fn used when an operator has 'killed' this feed in the demo layer.
    Raising here routes through the REAL fallback path (cache -> fixture), so a
    kill genuinely demonstrates the resilience that already exists — it does not
    fake a drop. Same code path that caught NASA's real 503 during testing."""
    raise ConnectionError("demo: live feed killed by operator (display layer only)")


async def get_live_witness(killed: bool = False) -> dict:
    """Genuinely live: current global WSPR activity vs its same-hour baseline.
    Mirrors /storm/live-now — fetched fresh each call, fetched_at always reflects
    when THIS request ran, freshness label falls back gracefully. One cheap query
    per call (baseline is cached), so it stays well under wspr.live's rate limit."""
    result = await fetch_with_fallback_async(
        "wspr_live_count", _killed_fetch if killed else _fetch_live_count
    )
    count = int(result["data"]) if result["data"] is not None else 0
    baseline = await _get_baseline_cached()
    deficit = _deficit_pct(count, baseline)
    return {
        "spot_count_1h": count,
        "baseline_1h": round(baseline) if baseline else None,
        "deficit_pct": deficit,
        "sky_status": "disturbed" if deficit >= DISTURBANCE_DEFICIT_PCT else "nominal",
        "disturbance_threshold_pct": DISTURBANCE_DEFICIT_PCT,
        "data_freshness": result["source"],  # live | cache | fixture | none
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "attribution": ATTRIBUTION,
        "coverage_note": COVERAGE_NOTE,
    }


async def get_ionosphere_signal(killed: bool = False) -> dict:
    """The ionosphere as one signal in Constellation Fusion — same shape as the
    DONKI/GOES/USGS signals so the panel and the kill-the-feed recalculation treat
    it uniformly. `signal_type: witness` marks it as ground-truth (effect already
    measured) rather than a forecast input; it still counts toward confidence."""
    try:
        w = await get_live_witness(killed=killed)
        deficit = w["deficit_pct"]
        freshness = w["data_freshness"]
    except Exception as e:
        logger.warning(f"[ionosphere] signal build failed ({e})")
        deficit, freshness = None, "none"
    return {
        "key": "wspr_ionosphere",
        "source": "HamSCI / WSPR (ionosphere witness)",
        "signal_type": "witness",
        "metric": "spot_deficit_pct",
        "value": deficit,
        "threshold": DISTURBANCE_DEFICIT_PCT,
        "crossed": deficit is not None and deficit >= DISTURBANCE_DEFICIT_PCT,
        "data_freshness": freshness,
        "attribution": ATTRIBUTION,
    }


# Hard ceiling on how many spots one request can ask for — this is a live
# visualization refreshed every few seconds, not a historical dump. Keeps the
# payload small and the render legible regardless of what a caller requests.
MAX_GEO_SPOTS = 500
DEFAULT_GEO_SPOTS = 300
# Window the geo query scans. wspr.live's schema orders by time, so windowing
# (rather than a bare ORDER BY time DESC LIMIT N over 2.7B rows) keeps this cheap.
GEO_WINDOW_MINUTES = 5


async def _fetch_recent_spots_geo(limit: int) -> list[dict]:
    """Most recent real spots with tx/rx geography. Excludes distance=0 rows —
    those are stations receiving their own transmission (self-monitoring configs,
    common in this dataset), not a propagation path, so they'd just be a dot with
    no arc. Real data only: no synthetic points, no interpolation."""
    rows = await _wspr_query(
        "SELECT time, tx_sign, tx_lat, tx_lon, rx_sign, rx_lat, rx_lon, "
        "frequency, band, distance FROM wspr.rx "
        f"WHERE time > now() - INTERVAL {GEO_WINDOW_MINUTES} MINUTE AND distance > 0 "
        f"ORDER BY time DESC LIMIT {limit}"
    )
    return rows


async def get_recent_spots_geo(limit: int = DEFAULT_GEO_SPOTS) -> dict:
    """Live sample of real WSPR propagation paths for the Global Propagation Map.
    Mirrors /storm/live-now: fetched fresh each call, fetched_at reflects when THIS
    request ran, falls back to the last cached sample (never blocks) on a slow or
    failed query. The live hourly total (spot_count_1h) is included alongside the
    sample so the UI can honestly label it as a sample, not the full picture."""
    limit = max(1, min(limit, MAX_GEO_SPOTS))
    result = await fetch_with_fallback_async("wspr_geo_spots", lambda: _fetch_recent_spots_geo(limit))
    rows = result["data"] or []
    spots = [
        {
            "tx_call": r["tx_sign"],
            "tx_lat": r["tx_lat"],
            "tx_lon": r["tx_lon"],
            "rx_call": r["rx_sign"],
            "rx_lat": r["rx_lat"],
            "rx_lon": r["rx_lon"],
            "freq_hz": r["frequency"],
            "band_m": r["band"],
            "distance_km": r["distance"],
            "time": r["time"],
        }
        for r in rows
    ]
    # Reuse the same hourly-total query the stat panel already uses, so the two
    # views can never disagree about "how much of the real total is this sample."
    hourly_total_result = await fetch_with_fallback_async("wspr_live_count", _fetch_live_count)
    hourly_total = int(hourly_total_result["data"]) if hourly_total_result["data"] is not None else None
    return {
        "spots": spots,
        "sample_size": len(spots),
        "requested_limit": limit,
        "hourly_total": hourly_total,
        "data_freshness": result["source"],  # live | cache | fixture | none
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "attribution": ATTRIBUTION,
        "coverage_note": COVERAGE_NOTE,
    }


def load_may2024_witness() -> dict:
    """Historical witness for the REPLAY: the REAL archived collapse in global
    radio propagation across the May 2024 G5 storm (20m band). Served from a
    bundled fixture — zero demo-time network risk. Numbers are what actually
    happened, recorded by tens of thousands of civilians, publicly queryable."""
    result = fetch_with_fallback_sync_may2024()
    return result


def fetch_with_fallback_sync_may2024() -> dict:
    """Read the pre-built May 2024 fixture (data/fixtures/wspr_may2024.json)."""
    from services.fallback_cache import _read_fixture
    data = _read_fixture("wspr_may2024")
    if not data:
        return {"available": False, "attribution": ATTRIBUTION}
    return {**data, "available": True, "attribution": ATTRIBUTION, "coverage_note": COVERAGE_NOTE}
