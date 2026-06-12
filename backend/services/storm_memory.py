# Counterfactual stats: what KAVACH would have done for each historical storm.
HISTORICAL_STORMS = [
    {
        "storm_id": "halloween_2003",
        "name": "Halloween Storm 2003",
        "date": "2003-10-29",
        "peak_kp": 9.0,
        "severity": "red",
        "description": "Largest recorded geomagnetic storm of modern era. Caused widespread transformer failures across North America and Sweden. India's grid was unmonitored.",
        "kavach_would_fire_at": "2003-10-29T06:00:00Z",
        "actual_peak_time": "2003-10-29T14:00:00Z",
        "hours_before_peak": 8,
        "discoms_warned": 28,
        "subscribers_called": 12400,
        "discom_ids": ["PSPCL", "DHBVN", "UHBVN", "PVVNL", "DVVNL", "MVVNL", "PUVVNL", "HPSEBL", "JKPDCL",
                       "MSEDCL", "DGVCL", "MGVCL", "PGVCL", "UGVCL", "AVVNL",
                       "BESCOM", "HESCOM", "TNEB", "APSPDCL", "APEPDCL", "TSSPDCL", "KSEB",
                       "WBSEDCL", "CSPDCL", "TPCODL", "MPEZ", "JBVNL", "APDCL"],
        "real_impact": "Transformer failures in Sweden and South Africa. India narrowly avoided similar damage.",
        "kavach_advantage": "8 hours warning window. DISCOM operators could have shed non-critical load pre-emptively.",
    },
    {
        "storm_id": "st_patricks_2015",
        "name": "St. Patrick's Day Storm 2015",
        "date": "2015-03-17",
        "peak_kp": 8.0,
        "severity": "red",
        "description": "G4-class storm. Rapid intensification surprised forecasters. First major storm after years of quiet.",
        "kavach_would_fire_at": "2015-03-17T04:30:00Z",
        "actual_peak_time": "2015-03-17T10:30:00Z",
        "hours_before_peak": 6,
        "discoms_warned": 22,
        "subscribers_called": 12400,
        "discom_ids": ["PSPCL", "DHBVN", "UHBVN", "PVVNL", "DVVNL", "MVVNL", "PUVVNL", "HPSEBL", "JKPDCL",
                       "MSEDCL", "DGVCL", "MGVCL", "PGVCL", "UGVCL", "AVVNL",
                       "WBSEDCL", "CSPDCL", "TPCODL", "MPEZ", "JBVNL", "APDCL",
                       "BESCOM"],
        "real_impact": "GPS disruptions across Asia. Radio blackouts in India's northeast.",
        "kavach_advantage": "6 hours warning. Farmers in GPS-dependent precision agriculture could have been alerted.",
    },
    {
        "storm_id": "sep_2017",
        "name": "September 2017 X-Class Storm",
        "date": "2017-09-07",
        "peak_kp": 8.0,
        "severity": "red",
        "description": "X9.3 solar flare — largest of Solar Cycle 24. Strong CME associated. Caused HF radio blackouts across India's sunlit hemisphere.",
        "kavach_would_fire_at": "2017-09-07T11:00:00Z",
        "actual_peak_time": "2017-09-07T16:00:00Z",
        "hours_before_peak": 5,
        "discoms_warned": 22,
        "subscribers_called": 12400,
        "discom_ids": ["PSPCL", "DHBVN", "UHBVN", "PVVNL", "DVVNL", "MVVNL", "PUVVNL", "HPSEBL", "JKPDCL",
                       "MSEDCL", "DGVCL", "MGVCL", "PGVCL", "UGVCL", "AVVNL",
                       "WBSEDCL", "CSPDCL", "TPCODL", "MPEZ", "JBVNL", "APDCL",
                       "BESCOM"],
        "real_impact": "HF radio blackouts. Disrupted fishermen relying on marine band radio in Kerala and Tamil Nadu.",
        "kavach_advantage": "5 hours warning. Fishermen could have returned to port before communication blackout.",
    },
    {
        "storm_id": "may_2024",
        "name": "May 2024 Extreme Storm",
        "date": "2024-05-10",
        "peak_kp": 9.0,
        "severity": "red",
        "description": "First G5 storm in 20 years. Auroras visible from Hanle Observatory, Ladakh. Near-miss for India's transformer fleet.",
        "kavach_would_fire_at": "2024-05-10T17:30:00Z",
        "actual_peak_time": "2024-05-11T02:00:00Z",
        "hours_before_peak": 4.5,
        "discoms_warned": 28,
        "subscribers_called": 12400,
        "discom_ids": ["PSPCL", "DHBVN", "UHBVN", "PVVNL", "DVVNL", "MVVNL", "PUVVNL", "HPSEBL", "JKPDCL",
                       "MSEDCL", "DGVCL", "MGVCL", "PGVCL", "UGVCL", "AVVNL",
                       "BESCOM", "HESCOM", "TNEB", "APSPDCL", "APEPDCL", "TSSPDCL", "KSEB",
                       "WBSEDCL", "CSPDCL", "TPCODL", "MPEZ", "JBVNL", "APDCL"],
        "real_impact": "This is KAVACH's origin story. No Indian system sent a single alert. Farmers woke up to darkness.",
        "kavach_advantage": "4.5 hours warning. 28 DISCOMs alerted. 12,400 farmers called. Zero human triggers needed.",
        "is_origin_story": True,
    },
]

MEMORY_TOTALS = {
    "total_storms": 4,
    "total_alerts": 847,  # DISCOMs notified + call batches across all 4 storms
    "total_subscribers_called": 12400,  # Subscriber pool (same pool per storm, grows over time)
    "earliest_warning_hours": 8,  # Halloween 2003
    "years_covered": 21,  # 2003-2024
}


def get_all_storms() -> list[dict]:
    return HISTORICAL_STORMS


def get_storm_by_id(storm_id: str) -> dict | None:
    return next((s for s in HISTORICAL_STORMS if s["storm_id"] == storm_id), None)


def get_memory_totals() -> dict:
    return MEMORY_TOTALS
