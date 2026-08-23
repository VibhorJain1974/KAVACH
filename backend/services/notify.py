"""Operator notifications via Telegram.

Used for one thing only: escalating a farmer's "press 2 — I need help" reply
to a real operator. Deliberately not a general notification framework.

Fail-safe rule, same as smart_beacon.py and every external call in this
codebase: this must never raise, never block the call flow, and must degrade
silently when unconfigured. A missed Telegram message is a bookkeeping loss;
a blocked or crashed reply handler would break a live phone call.
"""
import os
import logging
import threading
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

TELEGRAM_TIMEOUT_S = 10


def telegram_configured() -> bool:
    return bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)


def send_telegram_alert(message: str) -> dict:
    """Blocking send. Returns {"sent": bool, ...}; never raises.

    Checks Telegram's own `ok` field rather than trusting the absence of an
    exception — the API returns HTTP 200 with {"ok": false} for things like a
    bad chat_id, which would otherwise look like success.
    """
    if not telegram_configured():
        logger.info("[notify] TELEGRAM_BOT_TOKEN/CHAT_ID unset — escalation notification skipped")
        return {"sent": False, "reason": "not_configured"}

    try:
        r = httpx.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": message},
            timeout=TELEGRAM_TIMEOUT_S,
        )
        payload = {}
        try:
            payload = r.json()
        except Exception:
            pass

        if r.status_code == 200 and payload.get("ok") is True:
            logger.info(f"[notify] Telegram escalation delivered (message_id={payload.get('result', {}).get('message_id')})")
            return {"sent": True, "message_id": payload.get("result", {}).get("message_id")}

        # HTTP 200 with ok=false, or any non-200 — a real failure, logged as one.
        logger.warning(
            f"[notify] Telegram send FAILED http={r.status_code} "
            f"ok={payload.get('ok')} desc={payload.get('description')!r}"
        )
        return {"sent": False, "reason": "api_error", "status": r.status_code, "description": payload.get("description")}

    except Exception as e:
        logger.warning(f"[notify] Telegram send FAILED (non-fatal, reply flow continues): {e}")
        return {"sent": False, "reason": "exception", "error": str(e)}


def send_telegram_alert_async(message: str) -> None:
    """Fire-and-forget. Returns immediately so the TwiML response to Twilio is
    never delayed by a network round-trip to Telegram."""
    if not telegram_configured():
        logger.info("[notify] TELEGRAM_BOT_TOKEN/CHAT_ID unset — escalation notification skipped")
        return
    threading.Thread(target=send_telegram_alert, args=(message,), daemon=True).start()
