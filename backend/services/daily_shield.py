# Space Weather Score 0-100. Scheduled at 6:30 AM IST. Hindi for farmers, English for DISCOMs.
from datetime import datetime


def calculate_shield_score(kp: float, cme_inbound: bool = False, has_xclass_flare: bool = False) -> int:
    score = 100
    if kp > 8:
        score -= 80
    elif kp >= 7:
        score -= 60
    elif kp >= 5:
        score -= 30
    elif kp >= 3:
        score -= 10
    if cme_inbound:
        score -= 20
    if has_xclass_flare:
        score -= 15
    return max(0, score)


def gps_status(kp: float) -> str:
    if kp >= 7:
        return "Severely Degraded"
    if kp >= 5:
        return "Moderate Degradation"
    if kp >= 3:
        return "Minor Degradation"
    return "Normal"


def grid_risk_level(kp: float, cme_inbound: bool = False) -> str:
    if kp >= 7 or (kp >= 5 and cme_inbound):
        return "High"
    if kp >= 5:
        return "Elevated"
    if kp >= 3:
        return "Low"
    return "Minimal"


def recommended_actions(kp: float, cme_inbound: bool = False) -> list[str]:
    if kp >= 7:
        return [
            "Activate storm protocols at all substations",
            "Pre-position spare transformers",
            "Alert grid operators — manual override ready",
            "Warn satellite operators of communication disruption",
        ]
    if kp >= 5:
        return [
            "Monitor grid for voltage fluctuations",
            "Check GPS-dependent systems",
            "Alert northern DISCOMs",
        ]
    if cme_inbound:
        return ["CME inbound — prepare monitoring teams"]
    return ["No action required — nominal conditions"]


_GPS_HINDI = {
    "Normal": "सामान्य",
    "Minor Degradation": "मामूली गिरावट",
    "Moderate Degradation": "मध्यम गिरावट",
    "Severely Degraded": "गंभीर रूप से खराब",
}
_GRID_HINDI = {
    "Minimal": "न्यूनतम",
    "Low": "कम",
    "Elevated": "बढ़ा हुआ",
    "High": "उच्च",
}


def hindi_briefing(score: int, kp: float, date_str: str, cme_inbound: bool = False) -> str:
    gps = _GPS_HINDI.get(gps_status(kp), gps_status(kp))
    grid = _GRID_HINDI.get(grid_risk_level(kp, cme_inbound), grid_risk_level(kp, cme_inbound))
    cme_line = "CME चेतावनी: सक्रिय\n" if cme_inbound else ""
    return (
        f"KAVACH सुरक्षा संदेश — {date_str}\n"
        f"आज का स्पेस वेदर स्कोर: {score}/100\n"
        f"GPS शुद्धता: {gps}\n"
        f"ग्रिड सुरक्षा: {grid}\n"
        f"{cme_line}"
        f"किसी भी समस्या के लिए: KAVACH सक्रिय है।"
    )


def english_briefing(score: int, kp: float, date_str: str, cme_inbound: bool = False, has_xclass: bool = False) -> str:
    grid = grid_risk_level(kp, cme_inbound)
    cme_status = "Active inbound CME detected" if cme_inbound else "Clear"
    flare_status = "X-class flare active" if has_xclass else "None"
    actions = recommended_actions(kp, cme_inbound)
    return (
        f"KAVACH Daily Shield - {date_str}\n"
        f"Space Weather Score: {score}/100\n"
        f"Kp Current: {kp}\n"
        f"CME Watch: {cme_status}\n"
        f"Solar Flares: {flare_status}\n"
        f"Grid Risk: {grid}\n"
        f"Recommended Actions:\n" + "\n".join(f"  - {a}" for a in actions)
    )


def build_daily_brief(kp: float, cme_inbound: bool = False, has_xclass: bool = False) -> dict:
    score = calculate_shield_score(kp, cme_inbound, has_xclass)
    date_str = datetime.utcnow().strftime("%B %d, %Y")
    return {
        "score": score,
        "kp": kp,
        "date": date_str,
        "cme_inbound": cme_inbound,
        "has_xclass_flare": has_xclass,
        "gps_status": gps_status(kp),
        "grid_risk": grid_risk_level(kp, cme_inbound),
        "actions": recommended_actions(kp, cme_inbound),
        "hindi": hindi_briefing(score, kp, date_str, cme_inbound),
        "english": english_briefing(score, kp, date_str, cme_inbound, has_xclass),
    }
