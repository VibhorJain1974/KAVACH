import os
import asyncio
import logging

logger = logging.getLogger(__name__)

BEACON_PLUG_IP = os.getenv("BEACON_PLUG_IP")

# Bonus physical-light flourish for the demo — a TP-Link Kasa smart plug that
# lights up when storm severity goes red. Optional: if BEACON_PLUG_IP is
# unset, this is silently disabled and never touched. If the plug is
# offline, unreachable, or the library errors for any reason, set_beacon()
# swallows it and logs — this must never be able to block or crash the
# core demo, which is why every call site treats it as fire-and-forget.
#
# Uses python-kasa (`pip install python-kasa`), confirmed async API per
# Stage 0 research (findings.md): kasa.Discover.discover_single(ip) ->
# device.turn_on() / device.turn_off(). Not yet tested against real
# hardware — the plug hasn't arrived. If the device needs local auth
# (some newer Kasa firmware does), discover_single() also accepts
# username/password kwargs.

_last_state: bool | None = None


async def _set_beacon_async(on: bool) -> None:
    if not BEACON_PLUG_IP:
        return
    try:
        from kasa import Discover
        device = await Discover.discover_single(BEACON_PLUG_IP)
        if on:
            await device.turn_on()
        else:
            await device.turn_off()
        logger.info(f"[smart_beacon] plug at {BEACON_PLUG_IP} set to {'ON' if on else 'OFF'}")
    except Exception as e:
        logger.warning(f"[smart_beacon] failed to set plug state (non-fatal, demo continues): {e}")


def set_beacon(on: bool) -> None:
    """Fire-and-forget. Safe to call from sync or async contexts; never raises."""
    global _last_state
    if not BEACON_PLUG_IP:
        return
    if _last_state == on:
        return  # avoid redundant network calls on repeated same-state events
    _last_state = on
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(_set_beacon_async(on))
        else:
            loop.run_until_complete(_set_beacon_async(on))
    except Exception as e:
        logger.warning(f"[smart_beacon] scheduling failed (non-fatal): {e}")
