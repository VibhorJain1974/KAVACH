"""MOSDAC INSAT-3S satellite imagery — REAL, verified public near-real-time feed.

Checked directly on 2026-07-20 (not assumed from a search snippet — the honesty
standard this project holds every external API to):
  - MOSDAC Live (mosdac.gov.in/live) serves INSAT-3S Imager L1B products through a
    public ncWMS endpoint with NO auth / NO key (unlike VEDAS, which is key-gated).
  - Verified end-to-end: a GetMap for today's IMG_TIR1 returned a real 1036x850 PNG
    and, with a colormap, resolves to genuine thermal-IR cloud imagery over India.
  - ncWMS: supportedStyles boxfill/contour; palettes incl. rainbow/greyscale;
    per-scene min/max via GetMetadata item=minmax.

This is a toggleable map layer, additive and fallback-safe: if MOSDAC is slow or
down, we serve the last-known-good scene descriptor from cache and the overlay
simply doesn't refresh — it never blocks the map or the demo.

Attribution: imagery is ISRO / MOSDAC. KAVACH renders it, does not own it.
"""
import logging
import time
from datetime import datetime, timedelta, timezone

import httpx

from services.fallback_cache import fetch_with_fallback_async

logger = logging.getLogger(__name__)

# Verified live base. INSAT-3S Imager, L1B standard, 4km, half-hourly files whose
# TIMESTAMP is in the PATH (so the frontend needs the current file, not just params).
WMS_ROOT = "https://www.mosdac.gov.in/live_data/wms/live3SL1BSTD4km/products/Insat3s/3S_IMG"
LAYER = "IMG_TIR1"           # thermal infrared — cloud-top temperature, works day+night
STYLE = "boxfill/rainbow"    # red = cold high cloud tops (deep convection), blue = clear
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
HTTP_TIMEOUT_S = 12

# India-ish bbox in EPSG:3857 for the per-scene min/max stretch.
_INDIA_BBOX_3857 = "5011802.75,-741487.27,12179151.25,5139059.27"

# Fixed India bbox (EPSG:4326, lon/lat) for a single georeferenced overlay image.
# Rendered once per scene and placed on the map as a Mapbox `image` source at these
# four corners — far more robust across Mapbox projections than per-tile WMS.
_INDIA_BBOX_4326 = "60,0,100,40"
# Mapbox image-source corner order: top-left, top-right, bottom-right, bottom-left.
_INDIA_BOUNDS = [[60.0, 40.0], [100.0, 40.0], [100.0, 0.0], [60.0, 0.0]]

# The latest-scene probe is a few network round-trips; cache the resolved descriptor
# in-process so frontend polling doesn't re-probe every time. Imagery is ~30-min
# cadence, so a 10-minute TTL is plenty fresh.
_latest_cache: dict = {"data": None, "ts": 0.0}
_LATEST_TTL_S = 600

# Separate cache for the resolved scene descriptor (file_url + colorscalerange), so
# the image-bytes proxy endpoint can reconstruct the same MOSDAC GetMap URL without
# re-running the (slower) latest-scene probe on every image request.
_desc_cache: dict = {"desc": None, "ts": 0.0}


def _file_url(dt: datetime) -> str:
    dd = f"{dt.day:02d}{MONTHS[dt.month - 1]}{dt.year}"       # e.g. 20JUL2026
    folder = f"{dt.year}/{dt.day:02d}{MONTHS[dt.month - 1]}"  # e.g. 2026/20JUL
    fname = f"3SIMG_{dd}_{dt.hour:02d}{dt.minute:02d}_L1B_STD_V01R00.h5"
    return f"{WMS_ROOT}/{folder}/{fname}"


async def _exists(client: httpx.AsyncClient, url: str) -> bool:
    """A file exists if ncWMS returns layerDetails for it (cheap, ~1KB). ncWMS may
    send the JSON with a non-JSON content-type and leading whitespace, so match on
    body content, not the header."""
    try:
        r = await client.get(url, params={"request": "GetMetadata", "item": "layerDetails",
                                          "layerName": LAYER, "version": "1.3.0"})
        return r.status_code == 200 and ("scaleRange" in r.text or "supportedStyles" in r.text)
    except Exception:
        return False


async def _minmax(client: httpx.AsyncClient, url: str) -> tuple[float, float]:
    try:
        r = await client.get(url, params={
            "service": "WMS", "version": "1.3.0", "request": "GetMetadata", "item": "minmax",
            "LAYERS": LAYER, "CRS": "EPSG:3857", "SRS": "EPSG:3857",
            "BBOX": _INDIA_BBOX_3857, "WIDTH": "512", "HEIGHT": "512",
        })
        j = r.json()
        return float(j["min"]), float(j["max"])
    except Exception:
        return 457.0, 959.0  # sane default observed for this layer


async def _resolve_latest() -> dict:
    """Find the newest available INSAT-3S scene by probing back in 30-min steps.
    Raises if nothing found in the window, so fetch_with_fallback_async falls back
    to the last cached descriptor."""
    now = datetime.now(timezone.utc)
    # snap to the current half-hour, then walk back up to 6h (processing latency is
    # typically 30-60 min, so the newest file is a little behind wall-clock).
    now = now.replace(minute=(0 if now.minute < 30 else 30), second=0, microsecond=0)
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_S) as client:
        for i in range(13):  # 6.5h of 30-min slots
            dt = now - timedelta(minutes=30 * i)
            url = _file_url(dt)
            if await _exists(client, url):
                vmin, vmax = await _minmax(client, url)
                return {
                    "file_url": url,
                    "time_utc": dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "colorscalerange": f"{round(vmin)},{round(vmax)}",
                }
    raise LookupError("no recent INSAT-3S scene found in the last 6.5h")


def _mosdac_getmap_url(desc: dict) -> str:
    """The actual MOSDAC GetMap URL for the georeferenced India-bbox render
    (EPSG:4326). Fetched server-side only — see get_insat_image_bytes below for why."""
    return (
        f"{desc['file_url']}?service=WMS&version=1.1.1&request=GetMap"
        f"&layers={LAYER}&styles={STYLE}&colorscalerange={desc['colorscalerange']}"
        f"&numcolorbands=254&transparent=true&format=image/png"
        f"&srs=EPSG:4326&bbox={_INDIA_BBOX_4326}&width=1024&height=1024"
    )


async def get_latest_insat() -> dict:
    """Descriptor for the latest INSAT-3S TIR scene + a Mapbox-ready tile template.
    In-process TTL + fallback_cache so a slow/down MOSDAC never blocks the map."""
    now = time.time()
    if _latest_cache["data"] and now - _latest_cache["ts"] < _LATEST_TTL_S:
        return _latest_cache["data"]

    result = await fetch_with_fallback_async("mosdac_insat_latest", _resolve_latest)
    desc = result["data"]
    if not desc:
        return {
            "available": False,
            "source": result["source"],
            "note": "MOSDAC INSAT-3S scene unavailable right now — overlay hidden, map unaffected.",
            "attribution": "INSAT-3S imagery: ISRO / MOSDAC (mosdac.gov.in).",
        }

    payload = {
        "available": True,
        "satellite": "INSAT-3S",
        "product": "Imager TIR1 (thermal infrared, ~10.8µm)",
        "time_utc": desc["time_utc"],
        # Routed through OUR OWN backend, not MOSDAC directly: verified live that
        # MOSDAC only reflects Access-Control-Allow-Origin for localhost/its own
        # domain, not real external origins — a browser WebGL texture upload (what
        # Mapbox needs for a raster/image source) requires CORS clearance, so a
        # direct MOSDAC URL silently fails to composite from a real deployed site
        # even though the plain HTTP fetch succeeds. Same proxy pattern already
        # used for /demo/recording-audio (Twilio's authenticated recording).
        "image_url": "/imagery/insat-image",
        "bounds": _INDIA_BOUNDS,
        "legend": "Red = cold high cloud tops (deep convection) · Blue = clear / warm surface",
        "cadence": "~30 min",
        "data_freshness": result["source"],  # live | cache | fixture | none
        "attribution": "INSAT-3S imagery: ISRO / MOSDAC (mosdac.gov.in), near-real-time public feed. KAVACH renders it.",
    }
    _latest_cache.update({"data": payload, "ts": now})
    _desc_cache.update({"desc": desc, "ts": now})
    return payload


async def get_insat_image_bytes() -> tuple[bytes, str] | None:
    """Fetch the actual INSAT PNG bytes server-side (proxy target for
    /imagery/insat-image). Reuses the scene descriptor resolved by the most recent
    get_latest_insat() call — call that first so this doesn't re-probe MOSDAC.
    Returns (bytes, content_type) or None if no scene has been resolved yet or the
    fetch fails; the route treats None as 404, keeping the map overlay silent."""
    desc = _desc_cache["desc"]
    if not desc:
        await get_latest_insat()
        desc = _desc_cache["desc"]
    if not desc:
        return None
    url = _mosdac_getmap_url(desc)
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_S) as client:
            r = await client.get(url)
            r.raise_for_status()
            return r.content, r.headers.get("content-type", "image/png")
    except Exception as e:
        logger.warning(f"[mosdac_imagery] image proxy fetch failed: {e}")
        return None
