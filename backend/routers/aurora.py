from fastapi import APIRouter
from services.aurora_predictor import predict_aurora_visibility, get_active_aurora_locations, aurora_hindi_message

router = APIRouter(prefix="/aurora", tags=["aurora"])


@router.get("/predictions")
async def get_aurora_predictions(kp: float = 0.0):
    """Return aurora visibility predictions for all Indian locations at given Kp."""
    predictions = predict_aurora_visibility(kp)
    active = [p for p in predictions if p["predicted_visible"]]
    return {
        "kp": kp,
        "predictions": predictions,
        "active_count": len(active),
        "active_locations": [p["name"] for p in active],
        "alert_message": aurora_hindi_message(active[0]["name"], kp) if active else None,
    }


@router.get("/active")
async def get_active_aurora(kp: float = 0.0):
    """Return only locations with predicted aurora visibility."""
    return {"kp": kp, "locations": get_active_aurora_locations(kp)}
