from fastapi import APIRouter, HTTPException

from services.constellation_fusion import get_fusion_status
from services import demo_feed_state

router = APIRouter(prefix="/fusion", tags=["fusion"])


@router.get("/status")
async def fusion_status():
    """Fused confidence from NASA DONKI + NOAA GOES + USGS + HamSCI/WSPR ionosphere
    witness, with per-signal explainability. Kill-aware (display layer only)."""
    return await get_fusion_status()


@router.post("/feed-toggle")
async def feed_toggle(source: str, killed: bool = True):
    """'Kill the Feed' demo control. Toggle one source's LIVE connection in the
    DISPLAY layer and get the recomputed fusion back so the panel can show the
    confidence re-derive live.

    SECURITY: this only sets an in-memory display flag read by get_fusion_status.
    The autonomous storm-detection loop never reads demo_feed_state, so this cannot
    disable real monitoring — only how the fusion panel treats the source. Unknown
    source keys are rejected (can't be used to poke at anything else)."""
    if not demo_feed_state.set_killed(source, killed):
        raise HTTPException(
            status_code=400,
            detail=f"Unknown source '{source}'. Valid: {sorted(demo_feed_state.VALID_SOURCES)}",
        )
    return {
        "source": source,
        "killed": killed,
        "killed_now": sorted(demo_feed_state.killed_set()),
        "fusion": await get_fusion_status(),
    }


@router.get("/feed-state")
async def feed_state():
    """Current demo kill state — which sources are toggleable and which are killed."""
    return {
        "valid_sources": sorted(demo_feed_state.VALID_SOURCES),
        "killed": sorted(demo_feed_state.killed_set()),
    }
