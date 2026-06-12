from fastapi import APIRouter
from services.daily_shield import build_daily_brief, calculate_shield_score
from agents.noaa_agent import fetch_current_kp

router = APIRouter(prefix="/shield", tags=["shield"])


@router.get("/score")
async def get_shield_score():
    """Current Space Weather Score (0-100). 100 = perfect, 0 = extreme storm."""
    kp_data = await fetch_current_kp()
    kp = kp_data.get("kp", 0.0)
    score = calculate_shield_score(kp)
    return {
        "score": score,
        "kp": kp,
        "label": _score_label(score),
        "color": _score_color(score),
    }


@router.get("/daily-brief")
async def get_daily_brief():
    """Full daily briefing in Hindi and English."""
    kp_data = await fetch_current_kp()
    kp = kp_data.get("kp", 0.0)
    return build_daily_brief(kp)


def _score_label(score: int) -> str:
    if score >= 80:
        return "NOMINAL"
    if score >= 60:
        return "MINOR DISTURBANCE"
    if score >= 40:
        return "MODERATE STORM"
    if score >= 20:
        return "SEVERE STORM"
    return "EXTREME — G5 EVENT"


def _score_color(score: int) -> str:
    if score >= 80:
        return "#00ff88"
    if score >= 60:
        return "#ffd23f"
    if score >= 40:
        return "#ff6b35"
    return "#ff2d4a"
