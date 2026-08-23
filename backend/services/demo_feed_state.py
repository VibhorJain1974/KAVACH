"""In-memory demo feed-kill state — DISPLAY LAYER ONLY.

Feature: "Kill the Feed, Live". A presenter (or a judge handed the controls) can
toggle off a single data source's LIVE connection during the demo, to prove
KAVACH keeps working when it loses that source.

CRITICAL SECURITY BOUNDARY (verified in testing):
This state is read ONLY by the /fusion display path
(constellation_fusion.get_fusion_status). The autonomous storm-detection loop
— APScheduler polling, agents/noaa_agent, storm classification, the alert-firing
path — NEVER imports or reads this module. Toggling a feed here therefore cannot
disable real monitoring; it only changes how the fusion PANEL treats that source.
Keep it that way: do NOT import this module from any agent, scheduler, or
classification code path. It is intentionally not persisted (process memory only)
so a restart always returns every source to live.
"""
import logging

logger = logging.getLogger(__name__)

# Only these keys are toggleable. An unknown key is rejected, so the toggle
# endpoint can never be used to poke at anything other than the display sources.
VALID_SOURCES = {"donki_cme", "goes_xray", "usgs_magnetometer", "wspr_ionosphere"}

_killed: set[str] = set()


def set_killed(source: str, killed: bool) -> bool:
    """Toggle one source's demo-display kill flag. Returns False for unknown keys."""
    if source not in VALID_SOURCES:
        return False
    if killed:
        _killed.add(source)
    else:
        _killed.discard(source)
    logger.info(f"[demo_feed] {source} -> {'KILLED (display only)' if killed else 'revived'}")
    return True


def is_killed(source: str) -> bool:
    return source in _killed


def killed_set() -> set[str]:
    return set(_killed)


def reset() -> None:
    _killed.clear()
