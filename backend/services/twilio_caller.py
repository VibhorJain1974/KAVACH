import os
import time
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
FROM_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

# Exact Hindi text — tested and confirmed intelligible on Polly.Aditi
HINDI_TTS_MESSAGE = (
    "Namaste. Main KAVACH bol raha hoon. "
    "Ek bada solar toofan aa raha hai. "
    "Apni bijli band karein. Grid khatre mein hai. "
    "Yeh KAVACH ki taraf se automatic chetavani hai."
)

# Public fallback audio URL — served from Vercel frontend deploy
FALLBACK_AUDIO_URL = os.getenv(
    "KAVACH_AUDIO_URL",
    "https://frontend-rust-xi-79.vercel.app/hindi_alert.mp3",
)


def _tts_twiml(kp: float) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        "<Pause length=\"1\"/>"
        f'<Say language="hi-IN" voice="Polly.Aditi">{HINDI_TTS_MESSAGE}</Say>'
        "<Pause length=\"1\"/>"
        f'<Say language="hi-IN" voice="Polly.Aditi">Kp index: {kp:.1f}. Yeh ek extreme geomagnetic toofan hai.</Say>'
        "</Response>"
    )


def _audio_twiml() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        "<Pause length=\"1\"/>"
        f"<Play>{FALLBACK_AUDIO_URL}</Play>"
        "</Response>"
    )


def call_with_fallback(to_number: str, kp: float = 9.0, _retry: bool = True) -> dict:
    """
    Place Hindi alert call. Tries TTS first, falls back to pre-recorded MP3.
    Retries once after 30s if both methods fail.
    Never raises — logs failure and returns status dict.
    """
    client = Client(ACCOUNT_SID, AUTH_TOKEN)

    # Attempt 1: Polly.Aditi TTS
    try:
        call = client.calls.create(
            twiml=_tts_twiml(kp),
            to=to_number,
            from_=FROM_NUMBER,
            record=True,
        )
        logger.info(f"TTS call placed: SID={call.sid} to={to_number[-4:]}")
        return {"call_sid": call.sid, "status": call.status, "method": "TTS", "to": to_number}
    except Exception as e:
        logger.warning(f"TTS call failed ({to_number[-4:]}): {e} — trying audio fallback")

    # Attempt 2: Pre-recorded MP3 via <Play> verb
    try:
        call = client.calls.create(
            twiml=_audio_twiml(),
            to=to_number,
            from_=FROM_NUMBER,
            record=True,
        )
        logger.info(f"Audio fallback call placed: SID={call.sid} to={to_number[-4:]}")
        return {"call_sid": call.sid, "status": call.status, "method": "AUDIO_FALLBACK", "to": to_number}
    except Exception as e:
        logger.warning(f"Audio fallback call failed ({to_number[-4:]}): {e}")

    # Retry once after 30s if first round failed
    if _retry:
        logger.info(f"Both call methods failed — retrying {to_number[-4:]} in 30s")
        time.sleep(30)
        return call_with_fallback(to_number, kp, _retry=False)

    # All attempts exhausted
    logger.error(f"All call attempts failed for {to_number[-4:]}")
    return {"call_sid": None, "status": "failed", "method": "NONE", "to": to_number}


def make_alert_call(to_number: str, kp_index: float = 9.0) -> dict:
    """Public API — backward compatible. Delegates to call_with_fallback()."""
    return call_with_fallback(to_number, kp_index)


def call_multiple(numbers: list[str], kp: float = 9.0) -> list[dict]:
    """Fire calls to all numbers simultaneously. Returns results in order received."""
    if not numbers:
        return []
    with ThreadPoolExecutor(max_workers=len(numbers)) as pool:
        futures = {pool.submit(call_with_fallback, n, kp): n for n in numbers}
        results = {}
        for future in as_completed(futures):
            n = futures[future]
            try:
                results[n] = future.result()
            except Exception as e:
                results[n] = {"call_sid": None, "status": "failed", "method": "NONE", "to": n, "error": str(e)}
    return [results[n] for n in numbers]


def get_call_status(call_sid: str) -> dict:
    client = Client(ACCOUNT_SID, AUTH_TOKEN)
    call = client.calls(call_sid).fetch()
    return {"call_sid": call_sid, "status": call.status, "duration": call.duration}
