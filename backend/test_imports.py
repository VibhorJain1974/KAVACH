import sys
sys.path.insert(0, '.')

import fastapi, uvicorn, httpx, apscheduler, supabase, twilio, sse_starlette
from services.nasa import load_may2024_storm, parse_gst_events
from services.discom_mapper import map_storm_to_discoms

raw = load_may2024_storm()
storms = parse_gst_events(raw)
print(f"Storm events: {len(storms)}")
print(f"Max Kp: {storms[0]['max_kp']}")
print(f"Severity: {storms[0]['severity']}")

zones = map_storm_to_discoms('red', 9.0)
affected = [z for z in zones if z['affected']]
print(f"Total DISCOMs: {len(zones)}")
print(f"Affected at Kp=9.0: {len(affected)}")

from services.twilio_caller import ACCOUNT_SID
print(f"Twilio configured: {bool(ACCOUNT_SID)}")

print("ALL BACKEND SERVICES OK")
