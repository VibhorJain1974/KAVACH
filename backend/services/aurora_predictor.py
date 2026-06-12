AURORA_LOCATIONS = [
    {"name": "Hanle, Ladakh", "lat": 32.77, "lng": 78.96, "min_kp": 6.0, "region": "Ladakh"},
    {"name": "Pangong Tso", "lat": 33.73, "lng": 78.65, "min_kp": 6.5, "region": "Ladakh"},
    {"name": "Spiti Valley", "lat": 32.24, "lng": 78.07, "min_kp": 7.0, "region": "Himachal Pradesh"},
    {"name": "Rohtang Pass", "lat": 32.37, "lng": 77.24, "min_kp": 7.5, "region": "Himachal Pradesh"},
    {"name": "Kedarnath", "lat": 30.73, "lng": 79.06, "min_kp": 8.0, "region": "Uttarakhand"},
    {"name": "Delhi (horizon)", "lat": 28.61, "lng": 77.20, "min_kp": 9.0, "region": "Delhi"},
]


def predict_aurora_visibility(kp: float) -> list[dict]:
    """Predict aurora visibility at each Indian location given current Kp."""
    predictions = []
    for loc in AURORA_LOCATIONS:
        visible = kp >= loc["min_kp"]
        # Probability ramps from 0% at (min_kp - 1) to 100% at (min_kp + 1)
        kp_excess = kp - (loc["min_kp"] - 1.0)
        probability = max(0, min(100, int(kp_excess * 50)))
        predictions.append({
            "name": loc["name"],
            "lat": loc["lat"],
            "lng": loc["lng"],
            "region": loc["region"],
            "min_kp_required": loc["min_kp"],
            "predicted_visible": visible,
            "probability_pct": probability,
            "kp_at_prediction": kp,
        })
    return predictions


def aurora_hindi_message(location: str, kp: float) -> str:
    return (
        f"KAVACH aurora alert: Aaj raat {location} se "
        f"Northern Lights dikhne ki sambhavana hai. "
        f"Kp index: {kp}. Safed aur laal roshni dekhein."
    )


def get_active_aurora_locations(kp: float) -> list[dict]:
    """Return only locations where aurora is currently predicted visible."""
    return [p for p in predict_aurora_visibility(kp) if p["predicted_visible"]]
