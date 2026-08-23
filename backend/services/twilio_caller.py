import os
import time
import logging
import threading
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

# Per-language TTS config. Voices/language codes confirmed for hi-IN
# (already live-tested), en-IN, and ja-JP — all real Twilio<Say>/Amazon
# Polly voices. Punjabi (pa-IN) is implemented as live TTS per Stage 0
# research, but that research only had medium confidence on the exact
# voice name — TEST WITH A REAL CALL before relying on it for the actual
# demo (see findings.md). Tamil (ta-IN) had no confirmed voice at all and
# goes straight to a pre-recorded MP3 fallback, never a fake TTS attempt.
LANGUAGES = {
    "hindi": {
        "tts_supported": True,
        "twilio_lang": "hi-IN",
        "voice": "Polly.Aditi",
        "message": HINDI_TTS_MESSAGE,
        "kp_suffix": "Kp index: {kp:.1f}. Yeh ek extreme geomagnetic toofan hai.",
        "fallback_audio_env": "KAVACH_AUDIO_URL",
        "fallback_audio_default": "https://frontend-rust-xi-79.vercel.app/hindi_alert.mp3",
    },
    "english": {
        "tts_supported": True,
        "twilio_lang": "en-IN",
        "voice": "Polly.Raveena",
        "message": (
            "Hello. This is KAVACH. A major solar storm is approaching. "
            "Please switch off your electrical equipment — the power grid is at risk. "
            "This is an automatic warning from KAVACH."
        ),
        "kp_suffix": "Kp index: {kp:.1f}. This is an extreme geomagnetic storm.",
        "fallback_audio_env": "KAVACH_AUDIO_URL_ENGLISH",
        "fallback_audio_default": "https://frontend-rust-xi-79.vercel.app/alert_english.mp3",
    },
    "japanese": {
        "tts_supported": True,
        "twilio_lang": "ja-JP",
        "voice": "Polly.Mizuki",
        "message": (
            "もしもし、KAVACHです。大規模な太陽嵐が接近しています。"
            "電気機器の電源を切ってください。電力網が危険にさらされています。"
            "これはKAVACHからの自動警告です。"
        ),
        "kp_suffix": "Kp指数は{kp:.1f}です。これは極端な磁気嵐です。",
        "fallback_audio_env": "KAVACH_AUDIO_URL_JAPANESE",
        "fallback_audio_default": "https://frontend-rust-xi-79.vercel.app/alert_japanese.mp3",
    },
    "punjabi": {
        # NEEDS MANUAL VERIFICATION — Stage 0 research found this voice in a
        # summarized fetch, not the raw source table. If the real test call
        # fails or sounds wrong, flip tts_supported to False before demo day.
        "tts_supported": True,
        "needs_manual_verification": True,
        "twilio_lang": "pa-IN",
        "voice": "Google.pa-IN-Standard-A",
        "message": (
            "ਸਤ ਸ੍ਰੀ ਅਕਾਲ। ਇਹ ਕਵਚ ਬੋਲ ਰਿਹਾ ਹੈ। ਇੱਕ ਵੱਡਾ ਸੂਰਜੀ ਤੂਫ਼ਾਨ ਆ ਰਿਹਾ ਹੈ। "
            "ਆਪਣੀ ਬਿਜਲੀ ਬੰਦ ਕਰੋ। ਗਰਿੱਡ ਖ਼ਤਰੇ ਵਿੱਚ ਹੈ। "
            "ਇਹ ਕਵਚ ਵੱਲੋਂ ਆਟੋਮੈਟਿਕ ਚੇਤਾਵਨੀ ਹੈ।"
        ),
        "kp_suffix": "Kp index {kp:.1f} ਹੈ। ਇਹ ਇੱਕ ਬਹੁਤ ਵੱਡਾ ਭੂ-ਚੁੰਬਕੀ ਤੂਫ਼ਾਨ ਹੈ।",
        "fallback_audio_env": "KAVACH_AUDIO_URL_PUNJABI",
        "fallback_audio_default": "https://frontend-rust-xi-79.vercel.app/alert_punjabi.mp3",
    },
    # CORRECTION (2026-07-19): Tamil was previously shipped as fallback-audio-only
    # because earlier research found "no confirmed voice". That was WRONG — it was
    # a gap in the research, not a gap in Twilio. Twilio's TTS voice table lists
    # Google.ta-IN-Standard-C for ta-IN. Tamil is now real live TTS like the rest.
    "tamil": {
        "tts_supported": True,
        "twilio_lang": "ta-IN",
        "voice": "Google.ta-IN-Standard-C",
        "message": (
            "வணக்கம். இது கவச் பேசுகிறது. ஒரு பெரிய சூரிய புயல் வருகிறது. "
            "உங்கள் மின்சாரத்தை அணைக்கவும். மின் கட்டமைப்பு ஆபத்தில் உள்ளது. "
            "இது கவச் அனுப்பும் தானியங்கி எச்சரிக்கை."
        ),
        "kp_suffix": "Kp index {kp:.1f}. இது ஒரு மிகப் பெரிய புவிக்காந்த புயல்.",
        "fallback_audio_env": "KAVACH_AUDIO_URL_TAMIL",
        "fallback_audio_default": "https://frontend-rust-xi-79.vercel.app/alert_tamil.mp3",
    },
    "telugu": {
        "tts_supported": True,
        "twilio_lang": "te-IN",
        "voice": "Google.te-IN-Standard-A",
        "message": (
            "నమస్కారం. ఇది కవచ్ మాట్లాడుతోంది. ఒక పెద్ద సౌర తుఫాను వస్తోంది. "
            "మీ విద్యుత్ ఆపివేయండి. గ్రిడ్ ప్రమాదంలో ఉంది. "
            "ఇది కవచ్ నుండి ఆటోమేటిక్ హెచ్చరిక."
        ),
        "kp_suffix": "Kp index {kp:.1f}. ఇది ఒక తీవ్రమైన భూ అయస్కాంత తుఫాను.",
        "fallback_audio_env": "KAVACH_AUDIO_URL_TELUGU",
        "fallback_audio_default": "https://frontend-rust-xi-79.vercel.app/alert_telugu.mp3",
    },
    "marathi": {
        "tts_supported": True,
        "twilio_lang": "mr-IN",
        "voice": "Google.mr-IN-Standard-A",
        "message": (
            "नमस्कार. हे कवच बोलत आहे. एक मोठे सौर वादळ येत आहे. "
            "तुमची वीज बंद करा. ग्रीड धोक्यात आहे. "
            "ही कवचकडून स्वयंचलित सूचना आहे."
        ),
        "kp_suffix": "Kp index {kp:.1f}. हे एक अत्यंत तीव्र भूचुंबकीय वादळ आहे.",
        "fallback_audio_env": "KAVACH_AUDIO_URL_MARATHI",
        "fallback_audio_default": "https://frontend-rust-xi-79.vercel.app/alert_marathi.mp3",
    },
    "bengali": {
        "tts_supported": True,
        "twilio_lang": "bn-IN",
        "voice": "Google.bn-IN-Standard-A",
        "message": (
            "নমস্কার। এটি কবচ বলছে। একটি বড় সৌর ঝড় আসছে। "
            "আপনার বিদ্যুৎ বন্ধ করুন। গ্রিড বিপদে আছে। "
            "এটি কবচ থেকে একটি স্বয়ংক্রিয় সতর্কবার্তা।"
        ),
        "kp_suffix": "Kp index {kp:.1f}. এটি একটি অত্যন্ত তীব্র ভূচুম্বকীয় ঝড়।",
        "fallback_audio_env": "KAVACH_AUDIO_URL_BENGALI",
        "fallback_audio_default": "https://frontend-rust-xi-79.vercel.app/alert_bengali.mp3",
    },
    "gujarati": {
        "tts_supported": True,
        "twilio_lang": "gu-IN",
        "voice": "Google.gu-IN-Standard-A",
        "message": (
            "નમસ્તે. આ કવચ બોલી રહ્યું છે. એક મોટું સૌર તોફાન આવી રહ્યું છે. "
            "તમારી વીજળી બંધ કરો. ગ્રીડ જોખમમાં છે. "
            "આ કવચ તરફથી સ્વયંસંચાલિત ચેતવણી છે."
        ),
        "kp_suffix": "Kp index {kp:.1f}. આ એક અત્યંત તીવ્ર ભૂચુંબકીય તોફાન છે.",
        "fallback_audio_env": "KAVACH_AUDIO_URL_GUJARATI",
        "fallback_audio_default": "https://frontend-rust-xi-79.vercel.app/alert_gujarati.mp3",
    },
    "kannada": {
        "tts_supported": True,
        "twilio_lang": "kn-IN",
        "voice": "Google.kn-IN-Standard-A",
        "message": (
            "ನಮಸ್ಕಾರ. ಇದು ಕವಚ್ ಮಾತನಾಡುತ್ತಿದೆ. ಒಂದು ದೊಡ್ಡ ಸೌರ ಚಂಡಮಾರುತ ಬರುತ್ತಿದೆ. "
            "ನಿಮ್ಮ ವಿದ್ಯುತ್ ಆಫ್ ಮಾಡಿ. ಗ್ರಿಡ್ ಅಪಾಯದಲ್ಲಿದೆ. "
            "ಇದು ಕವಚ್‌ನಿಂದ ಸ್ವಯಂಚಾಲಿತ ಎಚ್ಚರಿಕೆ."
        ),
        "kp_suffix": "Kp index {kp:.1f}. ಇದು ಅತ್ಯಂತ ತೀವ್ರವಾದ ಭೂಕಾಂತೀಯ ಚಂಡಮಾರುತ.",
        "fallback_audio_env": "KAVACH_AUDIO_URL_KANNADA",
        "fallback_audio_default": "https://frontend-rust-xi-79.vercel.app/alert_kannada.mp3",
    },
}

DEFAULT_LANGUAGE = "hindi"


def get_language_info() -> dict:
    """Honest, API-facing summary of which languages have real TTS vs a pre-recorded fallback."""
    return {
        lang: {"tts_supported": cfg["tts_supported"], "voice": cfg.get("voice")}
        for lang, cfg in LANGUAGES.items()
    }


def _resolve_language(language: str) -> tuple[str, dict]:
    cfg = LANGUAGES.get(language)
    if cfg is None:
        logger.warning(f"Unknown language '{language}' requested — defaulting to {DEFAULT_LANGUAGE}")
        language = DEFAULT_LANGUAGE
        cfg = LANGUAGES[DEFAULT_LANGUAGE]
    return language, cfg


def _tts_twiml(kp: float, cfg: dict) -> str:
    suffix = cfg["kp_suffix"].format(kp=kp)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        "<Pause length=\"1\"/>"
        f'<Say language="{cfg["twilio_lang"]}" voice="{cfg["voice"]}">{cfg["message"]}</Say>'
        "<Pause length=\"1\"/>"
        f'<Say language="{cfg["twilio_lang"]}" voice="{cfg["voice"]}">{suffix}</Say>'
        "</Response>"
    )


def _audio_twiml(language: str, cfg: dict) -> str:
    url = os.getenv(cfg["fallback_audio_env"], cfg["fallback_audio_default"])
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        "<Pause length=\"1\"/>"
        f"<Play>{url}</Play>"
        "</Response>"
    )


# Answering Machine Detection. 'Enable' resolves human-vs-machine at answer
# time; 'DetectMessageEnd' would additionally wait for the greeting to finish,
# costing several extra seconds of dead air for a farmer — not worth it here.
# AMD is a DATA-QUALITY nicety only: if detection times out or errors, Twilio
# reports 'unknown' and the message plays anyway. It must never gate the alert.
MACHINE_DETECTION = "Enable"


def call_with_fallback(to_number: str, kp: float = 9.0, language: str = DEFAULT_LANGUAGE, _retry: bool = True) -> dict:
    """
    Place a voice alert call. Tries real TTS first (if the language has a
    confirmed Polly voice), falls back to a pre-recorded MP3 otherwise.
    Retries once after 30s if both methods fail. Never raises — logs
    failure and returns a status dict.
    """
    language, cfg = _resolve_language(language)
    client = Client(ACCOUNT_SID, AUTH_TOKEN)

    if cfg["tts_supported"]:
        try:
            call = client.calls.create(
                twiml=_tts_twiml(kp, cfg),
                to=to_number,
                from_=FROM_NUMBER,
                record=True,
                machine_detection=MACHINE_DETECTION,
            )
            logger.info(f"TTS call placed ({language}): SID={call.sid} to={to_number[-4:]}")
            watch_and_log_call(call.sid, to_number, language)
            return {"call_sid": call.sid, "status": call.status, "method": "TTS", "language": language, "to": to_number}
        except Exception as e:
            logger.warning(f"TTS call failed ({language}, {to_number[-4:]}): {e} — trying audio fallback")
    else:
        logger.info(f"No native TTS for '{language}' — using pre-recorded fallback audio directly")

    try:
        call = client.calls.create(
            twiml=_audio_twiml(language, cfg),
            to=to_number,
            from_=FROM_NUMBER,
            record=True,
            machine_detection=MACHINE_DETECTION,
        )
        method = "AUDIO_FALLBACK" if cfg["tts_supported"] else "AUDIO_FALLBACK_NO_NATIVE_TTS"
        logger.info(f"Audio fallback call placed ({language}): SID={call.sid} to={to_number[-4:]}")
        watch_and_log_call(call.sid, to_number, language)
        return {"call_sid": call.sid, "status": call.status, "method": method, "language": language, "to": to_number}
    except Exception as e:
        logger.warning(f"Audio fallback call failed ({language}, {to_number[-4:]}): {e}")

    if _retry:
        logger.info(f"Both call methods failed — retrying {to_number[-4:]} in 30s")
        time.sleep(30)
        return call_with_fallback(to_number, kp, language, _retry=False)

    logger.error(f"All call attempts failed for {to_number[-4:]}")
    return {"call_sid": None, "status": "failed", "method": "NONE", "language": language, "to": to_number}


def make_alert_call(to_number: str, kp_index: float = 9.0, language: str = DEFAULT_LANGUAGE) -> dict:
    """Public API — backward compatible. Delegates to call_with_fallback()."""
    return call_with_fallback(to_number, kp_index, language)


def call_multiple(numbers: list[str], kp: float = 9.0, language: str = DEFAULT_LANGUAGE) -> list[dict]:
    """Fire calls to all numbers simultaneously. Returns results in order received."""
    if not numbers:
        return []
    with ThreadPoolExecutor(max_workers=len(numbers)) as pool:
        futures = {pool.submit(call_with_fallback, n, kp, language): n for n in numbers}
        results = {}
        for future in as_completed(futures):
            n = futures[future]
            try:
                results[n] = future.result()
            except Exception as e:
                results[n] = {"call_sid": None, "status": "failed", "method": "NONE", "language": language, "to": n, "error": str(e)}
    return [results[n] for n in numbers]


# ---------------------------------------------------------------------------
# SMS fallback. Deliberately SHORT — an SMS is not a transcript of the call.
# Sent automatically when a voice call ends failed/no-answer/busy, so a farmer
# whose phone was engaged or switched off still gets the warning.
# ---------------------------------------------------------------------------
SMS_TEXT = {
    "hindi": "KAVACH CHETAVANI: Bada solar toofan aa raha hai. Apni bijli band karein. Grid khatre mein hai.",
    "english": "KAVACH ALERT: Major solar storm approaching. Switch off electrical equipment. Power grid at risk.",
    "punjabi": "ਕਵਚ ਚੇਤਾਵਨੀ: ਵੱਡਾ ਸੂਰਜੀ ਤੂਫ਼ਾਨ ਆ ਰਿਹਾ ਹੈ। ਬਿਜਲੀ ਬੰਦ ਕਰੋ। ਗਰਿੱਡ ਖ਼ਤਰੇ ਵਿੱਚ ਹੈ।",
    "tamil": "கவச் எச்சரிக்கை: பெரிய சூரிய புயல் வருகிறது. மின்சாரத்தை அணைக்கவும். மின் கட்டமைப்பு ஆபத்தில்.",
    "telugu": "కవచ్ హెచ్చరిక: పెద్ద సౌర తుఫాను వస్తోంది. విద్యుత్ ఆపివేయండి. గ్రిడ్ ప్రమాదంలో ఉంది.",
    "marathi": "कवच सूचना: मोठे सौर वादळ येत आहे. वीज बंद करा. ग्रीड धोक्यात आहे.",
    "bengali": "কবচ সতর্কতা: বড় সৌর ঝড় আসছে। বিদ্যুৎ বন্ধ করুন। গ্রিড বিপদে আছে।",
    "gujarati": "કવચ ચેતવણી: મોટું સૌર તોફાન આવી રહ્યું છે. વીજળી બંધ કરો. ગ્રીડ જોખમમાં છે.",
    "kannada": "ಕವಚ್ ಎಚ್ಚರಿಕೆ: ದೊಡ್ಡ ಸೌರ ಚಂಡಮಾರುತ ಬರುತ್ತಿದೆ. ವಿದ್ಯುತ್ ಆಫ್ ಮಾಡಿ. ಗ್ರಿಡ್ ಅಪಾಯದಲ್ಲಿದೆ.",
    "japanese": "KAVACH警報: 大規模な太陽嵐が接近中。電気機器の電源を切ってください。電力網が危険です。",
}

# Voice outcomes that should trigger an SMS backup.
SMS_FALLBACK_OUTCOMES = {"no-answer", "failed"}


def send_sms_alert(phone: str, language: str = DEFAULT_LANGUAGE, kp: float = 9.0, reason: str = "manual") -> dict:
    """Send the short SMS version of the alert. Never raises."""
    language, _ = _resolve_language(language)
    body = SMS_TEXT.get(language, SMS_TEXT["english"])
    body = f"{body} (Kp {kp:.1f})"
    try:
        client = Client(ACCOUNT_SID, AUTH_TOKEN)
        msg = client.messages.create(body=body, to=phone, from_=FROM_NUMBER)
        logger.info(f"SMS sent ({language}, reason={reason}): SID={msg.sid} to={phone[-4:]}")
        return {"sms_sid": msg.sid, "status": msg.status, "language": language, "to": phone, "reason": reason}
    except Exception as e:
        logger.warning(f"SMS failed ({language}, {phone[-4:]}): {e}")
        return {"sms_sid": None, "status": "failed", "language": language, "to": phone, "reason": reason, "error": str(e)}


# ---------------------------------------------------------------------------
# WhatsApp — TWILIO SANDBOX ONLY in this build.
#
# The Sandbox needs no business verification and works immediately, but every
# recipient must first send the join code to the sandbox number. That is fine
# for a live demo (a judge joins on the spot) and is NOT how the real product
# would work at scale — that needs a verified WhatsApp Business Account, which
# is a manual process handled outside this codebase. Nothing here should be
# presented as production-ready WhatsApp delivery.
# ---------------------------------------------------------------------------
# Twilio's shared sandbox sender. Override via .env if using a different one.
WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_NUMBER", "+14155238886")


def send_whatsapp_alert(phone: str, language: str = DEFAULT_LANGUAGE, kp: float = 9.0) -> dict:
    """Send the alert over WhatsApp via the Twilio Sandbox. Never raises.

    A common failure here is error 63015/63007 — recipient hasn't joined the
    sandbox. That is surfaced verbatim rather than swallowed, because the fix
    is a human action (send the join code) and hiding it would look like a bug.
    """
    language, _ = _resolve_language(language)
    body = SMS_TEXT.get(language, SMS_TEXT["english"])
    body = f"{body} (Kp {kp:.1f})"
    try:
        client = Client(ACCOUNT_SID, AUTH_TOKEN)
        msg = client.messages.create(
            body=body,
            to=f"whatsapp:{phone}",
            from_=f"whatsapp:{WHATSAPP_FROM}",
        )
        logger.info(f"WhatsApp sent ({language}): SID={msg.sid} to={phone[-4:]}")
        return {"message_sid": msg.sid, "status": msg.status, "language": language, "to": phone, "channel": "whatsapp_sandbox"}
    except Exception as e:
        logger.warning(f"WhatsApp failed ({language}, {phone[-4:]}): {e}")
        return {
            "message_sid": None, "status": "failed", "language": language, "to": phone,
            "channel": "whatsapp_sandbox", "error": str(e),
            "hint": "Recipient may not have joined the Twilio WhatsApp Sandbox — they must send the join code first.",
        }


def get_call_status(call_sid: str) -> dict:
    client = Client(ACCOUNT_SID, AUTH_TOKEN)
    call = client.calls(call_sid).fetch()
    answered_by = getattr(call, "answered_by", None)
    return {
        "call_sid": call_sid,
        "status": call.status,
        "duration": call.duration,
        "answered_by": answered_by,
        "outcome": classify_outcome(call.status, answered_by),
    }


def watch_and_log_call(call_sid: str, phone: str, language: str, timeout_s: int = 180) -> None:
    """Background-watch a placed call until it reaches a final state, then log
    the outcome (with AnsweredBy from AMD and the recording URL if any) to
    Supabase. Fire-and-forget: runs on a daemon thread, never raises, never
    touches the call itself.

    This is the polling pattern the recording-proof feature already uses,
    rather than introducing status-callback webhooks — which would need a
    publicly reachable URL and wouldn't work against a local backend.
    """
    if not call_sid:
        return

    def _watch():
        from services import db  # local import keeps db optional / avoids cycles
        client = Client(ACCOUNT_SID, AUTH_TOKEN)
        final = {"completed", "no-answer", "busy", "failed", "canceled"}
        status, answered_by = None, None
        waited = 0
        try:
            while waited < timeout_s:
                call = client.calls(call_sid).fetch()
                status = call.status
                answered_by = getattr(call, "answered_by", None)
                if status in final:
                    break
                time.sleep(3)
                waited += 3

            recording_url = None
            if status == "completed":
                # Give the recording a moment to finish writing; same
                # status!='completed' trap the /demo/recording endpoint hit.
                for _ in range(20):
                    recs = client.recordings.list(call_sid=call_sid, limit=1)
                    if recs and recs[0].status == "completed":
                        recording_url = f"/demo/recording-audio?sid={recs[0].sid}"
                        break
                    time.sleep(3)

            outcome = classify_outcome(status, answered_by)
            db.log_call(
                phone=phone,
                language=language,
                outcome=outcome,
                call_sid=call_sid,
                recording_url=recording_url,
            )
            logger.info(
                f"[watch] {call_sid[-8:]} status={status} answered_by={answered_by} "
                f"outcome={outcome} rec={bool(recording_url)}"
            )

            # Automatic SMS backup: the voice alert never reached them, so fall
            # back to text. Real product behaviour, not a demo flourish — a
            # farmer whose phone was engaged or off still gets the warning.
            # 'choose' is the IVR menu placeholder, not a real language.
            if outcome in SMS_FALLBACK_OUTCOMES:
                sms_lang = language if language in SMS_TEXT else DEFAULT_LANGUAGE
                sms = send_sms_alert(phone, sms_lang, reason=f"voice_{outcome}")
                db.log_call(
                    phone=phone,
                    language=sms_lang,
                    outcome=f"sms_backup_{'sent' if sms.get('sms_sid') else 'failed'}",
                    call_sid=sms.get("sms_sid"),
                    alert_type="sms_fallback",
                )
        except Exception as e:
            logger.warning(f"[watch] non-fatal failure watching {call_sid[-8:]}: {e}")

    threading.Thread(target=_watch, daemon=True).start()


def classify_outcome(status: str, answered_by: str | None) -> str:
    """Map Twilio's (status, AnsweredBy) pair to the outcome we log.

    AnsweredBy values from AMD: human | machine_start | machine_end_beep |
    machine_end_silence | machine_end_other | fax | unknown.

    'unknown' means detection timed out or couldn't decide — we treat that as
    'answered', never as a failure, because the message still played. Being
    wrong here costs us a slightly inaccurate log row; being wrong the other
    way would understate real delivered alerts.
    """
    if status in ("no-answer", "busy"):
        return "no-answer"
    if status in ("failed", "canceled"):
        return "failed"
    if status == "completed":
        if answered_by and answered_by.startswith("machine"):
            return "voicemail"
        if answered_by == "fax":
            return "failed"
        return "answered"
    return status or "unknown"


# ---------------------------------------------------------------------------
# "Let them choose" IVR — LIVE/ARBITRARY-NUMBER CALLS ONLY.
# The autonomous REPLAY STORM path never touches this and keeps its existing
# pre-selected-language behaviour unchanged.
# ---------------------------------------------------------------------------

# Full 10-language menu. Every language here has a confirmed live Twilio TTS
# voice, so each prompt line is spoken IN THAT LANGUAGE by that language's own
# voice — a Tamil speaker hears the Tamil line in Tamil, not an English
# sentence describing Tamil.
#
# <Gather> accepts only a single digit, so the tenth language uses 0.
# The spoken numeral in each prompt MUST match its assigned digit — a mismatch
# would tell the caller to press the wrong key, so treat these as paired.
#
# Menu length note: ten prompts run ~40s end to end, but Twilio's <Gather>
# collects input *while* the nested <Say> is still playing, so a caller who
# knows their digit can press immediately and skip the rest. Only someone who
# listens to the whole list waits the full duration.
IVR_MENU = [
    ("1", "hindi",    "Hindi ke liye ek dabayen."),
    ("2", "english",  "For English, press two."),
    ("3", "japanese", "日本語は三を押してください。"),
    ("4", "punjabi",  "ਪੰਜਾਬੀ ਲਈ ਚਾਰ ਦਬਾਓ।"),
    ("5", "tamil",    "தமிழுக்கு ஐந்தை அழுத்தவும்."),
    ("6", "telugu",   "తెలుగు కోసం ఆరు నొక్కండి."),
    ("7", "marathi",  "मराठीसाठी सात दाबा."),
    ("8", "bengali",  "বাংলার জন্য আট টিপুন।"),
    ("9", "gujarati", "ગુજરાતી માટે નવ દબાવો."),
    ("0", "kannada",  "ಕನ್ನಡಕ್ಕೆ ಸೊನ್ನೆ ಒತ್ತಿರಿ."),
]
IVR_DIGIT_TO_LANGUAGE = {digit: lang for digit, lang, _ in IVR_MENU}

IVR_GATHER_TIMEOUT = 6


def _ivr_menu_twiml(action_url: str) -> str:
    """TwiML for the language-choice menu. No digit pressed -> falls through
    past </Gather> and plays the default (Hindi) alert, never hangs up silent.

    Voice and language code are read from LANGUAGES rather than duplicated
    here, so changing a voice in one place can't leave the menu out of sync.
    """
    prompts = "".join(
        f'<Say language="{LANGUAGES[lang]["twilio_lang"]}" voice="{LANGUAGES[lang]["voice"]}">{text}</Say>'
        for _, lang, text in IVR_MENU
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        '<Pause length="1"/>'
        f'<Gather numDigits="1" timeout="{IVR_GATHER_TIMEOUT}" action="{action_url}" method="POST">'
        f"{prompts}"
        "</Gather>"
        # Reached only if the caller pressed nothing before the timeout.
        f'<Redirect method="POST">{action_url}?Digits=</Redirect>'
        "</Response>"
    )


# ---------------------------------------------------------------------------
# Two-way voice reply — "press 1 to confirm, 2 for help".
# Reuses the same <Gather> mechanism as the language menu rather than a
# parallel system. Appended AFTER the alert message so the alert always plays
# first; a farmer who hangs up immediately still got the warning.
# ---------------------------------------------------------------------------

# Per-language reply prompt + acknowledgements. English text is used for any
# language we haven't translated the prompt into yet, which is honest (the
# alert itself is still in the right language) and never silent.
REPLY_PROMPTS = {
    "hindi": {
        "ask": "Alert milne ki pushti ke liye ek dabayen. Madad chahiye to do dabayen.",
        "confirmed": "Dhanyavaad. Aapki pushti darj kar li gayi hai.",
        "help": "Aapki madad ki request darj kar li gayi hai.",
    },
    "english": {
        "ask": "Press 1 to confirm you received this alert. Press 2 if you need help.",
        "confirmed": "Thank you. Your confirmation has been recorded.",
        "help": "Your request for help has been recorded.",
    },
    "punjabi": {
        "ask": "ਪੁਸ਼ਟੀ ਲਈ ਇੱਕ ਦਬਾਓ। ਮਦਦ ਲਈ ਦੋ ਦਬਾਓ।",
        "confirmed": "ਧੰਨਵਾਦ। ਤੁਹਾਡੀ ਪੁਸ਼ਟੀ ਦਰਜ ਕਰ ਲਈ ਗਈ ਹੈ।",
        "help": "ਤੁਹਾਡੀ ਮਦਦ ਦੀ ਬੇਨਤੀ ਦਰਜ ਕਰ ਲਈ ਗਈ ਹੈ।",
    },
    "tamil": {
        "ask": "உறுதிப்படுத்த ஒன்றை அழுத்தவும். உதவி தேவைப்பட்டால் இரண்டை அழுத்தவும்.",
        "confirmed": "நன்றி. உங்கள் உறுதிப்படுத்தல் பதிவு செய்யப்பட்டது.",
        "help": "உங்கள் உதவி கோரிக்கை பதிவு செய்யப்பட்டது.",
    },
    "telugu": {
        "ask": "ధృవీకరించడానికి ఒకటి నొక్కండి. సహాయం కావాలంటే రెండు నొక్కండి.",
        "confirmed": "ధన్యవాదాలు. మీ ధృవీకరణ నమోదు చేయబడింది.",
        "help": "మీ సహాయ అభ్యర్థన నమోదు చేయబడింది.",
    },
    "marathi": {
        "ask": "पुष्टीसाठी एक दाबा. मदतीसाठी दोन दाबा.",
        "confirmed": "धन्यवाद. तुमची पुष्टी नोंदवली आहे.",
        "help": "तुमची मदतीची विनंती नोंदवली आहे.",
    },
    "bengali": {
        "ask": "নিশ্চিত করতে এক টিপুন। সাহায্যের জন্য দুই টিপুন।",
        "confirmed": "ধন্যবাদ। আপনার নিশ্চিতকরণ নথিভুক্ত হয়েছে।",
        "help": "আপনার সাহায্যের অনুরোধ নথিভুক্ত হয়েছে।",
    },
    "gujarati": {
        "ask": "પુષ્ટિ કરવા માટે એક દબાવો. મદદ માટે બે દબાવો.",
        "confirmed": "આભાર. તમારી પુષ્ટિ નોંધવામાં આવી છે.",
        "help": "તમારી મદદની વિનંતી નોંધવામાં આવી છે.",
    },
    "kannada": {
        "ask": "ದೃಢೀಕರಿಸಲು ಒಂದು ಒತ್ತಿರಿ. ಸಹಾಯ ಬೇಕಿದ್ದರೆ ಎರಡು ಒತ್ತಿರಿ.",
        "confirmed": "ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ದೃಢೀಕರಣ ದಾಖಲಾಗಿದೆ.",
        "help": "ನಿಮ್ಮ ಸಹಾಯ ವಿನಂತಿ ದಾಖಲಾಗಿದೆ.",
    },
    "japanese": {
        "ask": "確認するには1を、助けが必要な場合は2を押してください。",
        "confirmed": "ありがとうございます。確認を記録しました。",
        "help": "支援のご要望を記録しました。",
    },
}

REPLY_GATHER_TIMEOUT = 8


def _reply_prompt(language: str, key: str) -> str:
    return REPLY_PROMPTS.get(language, REPLY_PROMPTS["english"])[key]


def _say(cfg: dict, text: str) -> str:
    return f'<Say language="{cfg["twilio_lang"]}" voice="{cfg["voice"]}">{text}</Say>'


def alert_with_reply_twiml(kp: float, language: str, action_url: str) -> str:
    """Alert message, then a <Gather> asking for confirmation. If the language
    has no TTS voice the alert plays as audio and the reply prompt is skipped
    (can't ask a question we have no voice for)."""
    language, cfg = _resolve_language(language)
    if not cfg["tts_supported"]:
        return _audio_twiml(language, cfg)

    suffix = cfg["kp_suffix"].format(kp=kp)
    action = f"{action_url}?language={language}"
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        '<Pause length="1"/>'
        f"{_say(cfg, cfg['message'])}"
        '<Pause length="1"/>'
        f"{_say(cfg, suffix)}"
        '<Pause length="1"/>'
        f'<Gather numDigits="1" timeout="{REPLY_GATHER_TIMEOUT}" action="{action}" method="POST">'
        f"{_say(cfg, _reply_prompt(language, 'ask'))}"
        "</Gather>"
        # No digit pressed — fall through, logged as no_response by the handler.
        f'<Redirect method="POST">{action}&amp;Digits=</Redirect>'
        "</Response>"
    )


def reply_response_twiml(language: str, digit: str, detail_action_url: str | None = None) -> tuple[str, str]:
    """Handle the pressed reply digit. Returns (twiml, outcome_tag).
    outcome_tag is one of: confirmed | needs_help | no_response.

    When digit=="2" and detail_action_url is given (backend is publicly
    reachable — see _public_base_url in routers/demo.py), the response is a
    follow-up <Gather> asking WHY help is needed instead of an immediate
    Hangup. This is a separate <Gather>/action URL from both the language-menu
    Gather and this same Gather's digit "1"/"2" branch, so it cannot collide
    with either — Twilio only ever plays it after a genuine digit=="2" here.
    """
    language, cfg = _resolve_language(language)
    digit = (digit or "").strip()

    if digit == "1":
        text, tag = _reply_prompt(language, "confirmed"), "confirmed"
    elif digit == "2":
        tag = "needs_help"
        if detail_action_url and cfg["tts_supported"]:
            return needs_help_followup_twiml(language, detail_action_url), tag
        text = _reply_prompt(language, "help")
    else:
        # Timeout or unrecognised key — end politely, never hang up silently.
        text, tag = _reply_prompt(language, "confirmed"), "no_response"

    body = _say(cfg, text) if cfg["tts_supported"] else ""
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        f"{body}"
        "<Hangup/>"
        "</Response>"
    )
    return twiml, tag


# ---------------------------------------------------------------------------
# Escalation follow-up — "which kind of help" menu, played right after a
# genuine press-2 on the confirm/help Gather above. Only covers hindi/english
# with real translated prompts; every other language falls back to English
# text here, same documented convention REPLY_PROMPTS already uses for any
# language without a translated prompt — the alert itself still played in the
# caller's own language, this follow-up menu just isn't translated yet.
# ---------------------------------------------------------------------------

ESCALATION_GATHER_TIMEOUT = 8

ESCALATION_CATEGORY_PROMPTS = {
    "hindi": {
        "ask": "Kis tarah ki madad chahiye yeh batane ke liye: upkaran ya bijli connection se juda sawaal ho to ek dabayen. Samudra mein hone ki soochna deni ho to do dabayen. Kisi aur karan ke liye teen dabayen.",
        "equipment": "Aapke upkaran ya bijli connection se judi madad ki request darj kar li gayi hai.",
        "at_sea": "Aap samudra mein hain, yeh soochna darj kar li gayi hai.",
        "other": "Aapki madad ki request darj kar li gayi hai.",
        "unspecified": "Aapki madad ki request darj kar li gayi hai.",
    },
    "english": {
        "ask": "To tell us more: press 1 if this is about your equipment or power connection. Press 2 if you are at sea. Press 3 for any other reason.",
        "equipment": "Your equipment or power-connection help request has been recorded.",
        "at_sea": "Your at-sea status has been recorded.",
        "other": "Your help request has been recorded.",
        "unspecified": "Your help request has been recorded.",
    },
}

ESCALATION_DIGIT_TO_CATEGORY = {"1": "equipment", "2": "at_sea", "3": "other"}


def _escalation_prompt(language: str, key: str) -> str:
    prompts = ESCALATION_CATEGORY_PROMPTS.get(language, ESCALATION_CATEGORY_PROMPTS["english"])
    return prompts.get(key, ESCALATION_CATEGORY_PROMPTS["english"][key])


def needs_help_followup_twiml(language: str, action_url: str) -> str:
    language, cfg = _resolve_language(language)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        f"{_say(cfg, _reply_prompt(language, 'help'))}"
        '<Pause length="1"/>'
        f'<Gather numDigits="1" timeout="{ESCALATION_GATHER_TIMEOUT}" action="{action_url}" method="POST">'
        f"{_say(cfg, _escalation_prompt(language, 'ask'))}"
        "</Gather>"
        # No digit pressed — fall through, logged as unspecified category.
        f'<Redirect method="POST">{action_url}&amp;Digits=</Redirect>'
        "</Response>"
    )


def escalation_followup_response_twiml(language: str, digit: str) -> tuple[str, str | None]:
    """Handle the pressed follow-up digit. Returns (twiml, category);
    category is None (unspecified) for a timeout or unrecognised digit."""
    language, cfg = _resolve_language(language)
    category = ESCALATION_DIGIT_TO_CATEGORY.get((digit or "").strip())
    text = _escalation_prompt(language, category or "unspecified")
    body = _say(cfg, text) if cfg["tts_supported"] else ""
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        f"{body}"
        "<Hangup/>"
        "</Response>"
    )
    return twiml, category


def call_with_reply(to_number: str, kp: float, language: str, action_url: str) -> dict:
    """Place an alert call that asks for a confirmation digit afterwards."""
    language, _ = _resolve_language(language)
    client = Client(ACCOUNT_SID, AUTH_TOKEN)
    try:
        call = client.calls.create(
            twiml=alert_with_reply_twiml(kp, language, action_url),
            to=to_number,
            from_=FROM_NUMBER,
            record=True,
            machine_detection=MACHINE_DETECTION,
        )
        logger.info(f"Two-way reply call placed ({language}): SID={call.sid} to={to_number[-4:]}")
        watch_and_log_call(call.sid, to_number, language)
        return {"call_sid": call.sid, "status": call.status, "method": "TTS_TWO_WAY", "language": language, "to": to_number}
    except Exception as e:
        logger.warning(f"Two-way call failed ({language}, {to_number[-4:]}): {e} — falling back to one-way")
        return call_with_fallback(to_number, kp, language)


def ivr_language_twiml(kp: float, digit: str | None) -> tuple[str, str]:
    """Given the pressed digit, return (twiml, language_used) for the alert.
    Unrecognised or absent digit -> DEFAULT_LANGUAGE (Hindi), per spec."""
    language = IVR_DIGIT_TO_LANGUAGE.get((digit or "").strip(), DEFAULT_LANGUAGE)
    language, cfg = _resolve_language(language)
    twiml = _tts_twiml(kp, cfg) if cfg["tts_supported"] else _audio_twiml(language, cfg)
    return twiml, language


def call_with_language_menu(to_number: str, kp: float, action_url: str) -> dict:
    """Place a call that opens with the language-choice menu instead of a
    single pre-picked language. Live/judge calls only."""
    client = Client(ACCOUNT_SID, AUTH_TOKEN)
    try:
        call = client.calls.create(
            twiml=_ivr_menu_twiml(action_url),
            to=to_number,
            from_=FROM_NUMBER,
            record=True,
            machine_detection=MACHINE_DETECTION,
        )
        logger.info(f"IVR choose-language call placed: SID={call.sid} to={to_number[-4:]}")
        watch_and_log_call(call.sid, to_number, "choose")
        return {"call_sid": call.sid, "status": call.status, "method": "IVR_CHOOSE", "language": "choose", "to": to_number}
    except Exception as e:
        logger.warning(f"IVR call failed ({to_number[-4:]}): {e} — falling back to {DEFAULT_LANGUAGE}")
        return call_with_fallback(to_number, kp, DEFAULT_LANGUAGE)
