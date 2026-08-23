"""INSAT-3S satellite imagery overlay endpoint (ISRO / MOSDAC public ncWMS)."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from services.mosdac_imagery import get_latest_insat, get_insat_image_bytes

router = APIRouter(prefix="/imagery", tags=["imagery"])


@router.get("/insat-latest")
async def insat_latest():
    """Descriptor + Mapbox-ready image_url for the latest INSAT-3S TIR scene.
    Fallback-safe: returns available:false (map unaffected) if MOSDAC is unreachable."""
    return await get_latest_insat()


@router.get("/insat-image")
async def insat_image():
    """Proxies the actual INSAT PNG through our backend (no browser CORS needed).

    Verified live: MOSDAC's ncWMS only reflects Access-Control-Allow-Origin for
    localhost and its own domain, not real external origins — so a real deployed
    frontend can fetch the image with a plain <img> tag, but Mapbox's WebGL raster
    source (which needs to read pixels into a texture) is silently blocked by the
    browser's CORS check. Fetching server-side and re-serving through our own
    already-open CORS policy (main.py's CORSMiddleware, allow_origins=["*"]) sidesteps
    that entirely. Same proxy pattern as /demo/recording-audio for Twilio recordings.
    """
    result = await get_insat_image_bytes()
    if result is None:
        raise HTTPException(status_code=404, detail="INSAT scene unavailable")
    content, content_type = result
    return Response(content=content, media_type=content_type)
