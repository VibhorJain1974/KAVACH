from fastapi import APIRouter, HTTPException
from services.storm_memory import get_all_storms, get_storm_by_id, get_memory_totals

router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("/storms")
async def list_storms():
    """All historical storms with KAVACH would-have stats."""
    return {
        "storms": get_all_storms(),
        "totals": get_memory_totals(),
    }


@router.get("/storms/{storm_id}")
async def get_storm(storm_id: str):
    """Single historical storm detail."""
    storm = get_storm_by_id(storm_id)
    if not storm:
        raise HTTPException(status_code=404, detail=f"Storm '{storm_id}' not found")
    return storm


@router.get("/totals")
async def get_totals():
    """Aggregate stats across all storms."""
    return get_memory_totals()
