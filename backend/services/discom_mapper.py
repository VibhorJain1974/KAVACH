"""
Maps storm severity to affected Indian DISCOM grid zones.
Higher Kp = more zones affected, starting from north (most exposed).
"""

DISCOMS = [
    # Northern Region (most vulnerable — closest to magnetic pole)
    {"id": "PVVNL", "name": "Paschimanchal Vidyut Vitran Nigam", "state": "Uttar Pradesh", "region": "north", "lat": 28.67, "lng": 77.22},
    {"id": "DVVNL", "name": "Dakshinanchal Vidyut Vitran Nigam", "state": "Uttar Pradesh", "region": "north", "lat": 26.85, "lng": 80.95},
    {"id": "MVVNL", "name": "Madhyanchal Vidyut Vitran Nigam", "state": "Uttar Pradesh", "region": "north", "lat": 26.46, "lng": 80.33},
    {"id": "PUVVNL", "name": "Purvanchal Vidyut Vitran Nigam", "state": "Uttar Pradesh", "region": "north", "lat": 25.31, "lng": 82.97},
    {"id": "DHBVN", "name": "Dakshin Haryana Bijli Vitran Nigam", "state": "Haryana", "region": "north", "lat": 28.46, "lng": 77.03},
    {"id": "UHBVN", "name": "Uttar Haryana Bijli Vitran Nigam", "state": "Haryana", "region": "north", "lat": 29.95, "lng": 76.82},
    {"id": "PSPCL", "name": "Punjab State Power Corporation", "state": "Punjab", "region": "north", "lat": 30.73, "lng": 76.78},
    {"id": "HPSEBL", "name": "HP State Electricity Board", "state": "Himachal Pradesh", "region": "north", "lat": 31.10, "lng": 77.17},
    {"id": "JKPDCL", "name": "J&K Power Development Corp", "state": "Jammu & Kashmir", "region": "north", "lat": 32.73, "lng": 74.87},
    # Western Region
    {"id": "MSEDCL", "name": "Maharashtra State Electricity Dist Corp", "state": "Maharashtra", "region": "west", "lat": 19.08, "lng": 72.88},
    {"id": "DGVCL", "name": "Dakshin Gujarat Vij Company", "state": "Gujarat", "region": "west", "lat": 21.17, "lng": 72.83},
    {"id": "MGVCL", "name": "Madhya Gujarat Vij Company", "state": "Gujarat", "region": "west", "lat": 22.30, "lng": 73.18},
    {"id": "PGVCL", "name": "Paschim Gujarat Vij Company", "state": "Gujarat", "region": "west", "lat": 22.47, "lng": 70.06},
    {"id": "UGVCL", "name": "Uttar Gujarat Vij Company", "state": "Gujarat", "region": "west", "lat": 23.22, "lng": 72.63},
    {"id": "AVVNL", "name": "Ajmer Vidyut Vitran Nigam", "state": "Rajasthan", "region": "west", "lat": 26.45, "lng": 74.64},
    # Southern Region (less vulnerable but still affected at Kp>7)
    {"id": "BESCOM", "name": "Bangalore Electricity Supply Company", "state": "Karnataka", "region": "south", "lat": 12.97, "lng": 77.59},
    {"id": "HESCOM", "name": "Hubli Electricity Supply Company", "state": "Karnataka", "region": "south", "lat": 15.36, "lng": 75.13},
    {"id": "TNEB", "name": "Tamil Nadu Electricity Board", "state": "Tamil Nadu", "region": "south", "lat": 13.08, "lng": 80.27},
    {"id": "APSPDCL", "name": "AP Southern Power Dist Corp", "state": "Andhra Pradesh", "region": "south", "lat": 14.47, "lng": 78.82},
    {"id": "APEPDCL", "name": "AP Eastern Power Dist Corp", "state": "Andhra Pradesh", "region": "south", "lat": 17.69, "lng": 83.21},
    {"id": "TSSPDCL", "name": "TS Southern Power Dist Corp", "state": "Telangana", "region": "south", "lat": 17.38, "lng": 78.48},
    {"id": "KSEB", "name": "Kerala State Electricity Board", "state": "Kerala", "region": "south", "lat": 10.52, "lng": 76.21},
    # Eastern Region
    {"id": "WBSEDCL", "name": "West Bengal State Electricity Dist Corp", "state": "West Bengal", "region": "east", "lat": 22.57, "lng": 88.36},
    {"id": "CSPDCL", "name": "Chhattisgarh State Power Dist Corp", "state": "Chhattisgarh", "region": "east", "lat": 21.25, "lng": 81.63},
    {"id": "TPCODL", "name": "TP Central Odisha Distribution", "state": "Odisha", "region": "east", "lat": 20.27, "lng": 85.83},
    # Central Region
    {"id": "MPEZ", "name": "MP Poorv Kshetra Vidyut Vitran", "state": "Madhya Pradesh", "region": "central", "lat": 23.18, "lng": 77.40},
    {"id": "JBVNL", "name": "Jharkhand Bijli Vitran Nigam", "state": "Jharkhand", "region": "central", "lat": 23.34, "lng": 85.31},
    # Northeast
    {"id": "APDCL", "name": "Assam Power Distribution Corp", "state": "Assam", "region": "northeast", "lat": 26.14, "lng": 91.74},
]

# Risk by region at each severity level
REGION_RISK = {
    "red": {"north": "critical", "central": "high", "west": "high", "east": "medium", "south": "medium", "northeast": "high"},
    "yellow": {"north": "high", "central": "medium", "west": "medium", "east": "low", "south": "low", "northeast": "medium"},
    "green": {r: "none" for r in ["north", "central", "west", "east", "south", "northeast"]},
}

RISK_COLOR = {"critical": "red", "high": "orange", "medium": "yellow", "low": "green", "none": "green"}


def map_storm_to_discoms(severity: str, max_kp: float) -> list[dict]:
    region_risks = REGION_RISK.get(severity, REGION_RISK["green"])
    result = []
    for d in DISCOMS:
        risk = region_risks.get(d["region"], "none")
        result.append({
            **d,
            "risk_level": RISK_COLOR[risk],
            "risk_label": risk,
            "affected": risk not in ("none", "low"),
            "max_kp": max_kp,
        })
    return result


def get_all_discoms() -> list[dict]:
    return [{**d, "risk_level": "green", "risk_label": "none", "affected": False, "max_kp": 0} for d in DISCOMS]
