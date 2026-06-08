import os
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
FROM_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

HINDI_TTS_MESSAGE = os.getenv(
    "HINDI_TTS_MESSAGE",
    "Namaste. KAVACH alert. Aaj ek bada solar toofan aa raha hai. "
    "Apne bijli ke upkaran bandh karein. Grid failure ka khatre hai. Surakshit rahein."
)


def make_alert_call(to_number: str, kp_index: float = 9.0) -> dict:
    """Place outbound Hindi TTS call. Returns call SID and status."""
    client = Client(ACCOUNT_SID, AUTH_TOKEN)

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say language="hi-IN" voice="Polly.Aditi">{HINDI_TTS_MESSAGE}</Say>
  <Pause length="1"/>
  <Say language="hi-IN" voice="Polly.Aditi">Kp index: {kp_index:.1f}. Yeh ek extreme geomagnetic toofan hai.</Say>
</Response>"""

    call = client.calls.create(
        twiml=twiml,
        to=to_number,
        from_=FROM_NUMBER,
    )
    return {"call_sid": call.sid, "status": call.status, "to": to_number}


def get_call_status(call_sid: str) -> dict:
    client = Client(ACCOUNT_SID, AUTH_TOKEN)
    call = client.calls(call_sid).fetch()
    return {"call_sid": call_sid, "status": call.status, "duration": call.duration}
