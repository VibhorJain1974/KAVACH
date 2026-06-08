"""Test Twilio Hindi call — rings DEMO_PHONE_NUMBER."""
import sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()
from services.twilio_caller import make_alert_call
import os

phone = os.getenv('DEMO_PHONE_NUMBER')
print(f"Calling: {phone}")
result = make_alert_call(phone, 9.0)
print(f"Call SID: {result['call_sid']}")
print(f"Status: {result['status']}")
print("TWILIO CALL PLACED — check your phone!")
