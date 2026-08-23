import os
import json
import time
import logging
from pathlib import Path
from typing import Any, Awaitable, Callable

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).parent.parent / "data" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

FIXTURE_DIR = Path(__file__).parent.parent / "data" / "fixtures"

MAX_CACHE_AGE_SECONDS = 24 * 60 * 60


def is_offline_mode() -> bool:
    return os.getenv("DEMO_OFFLINE_MODE", "false").lower() == "true"


def _cache_path(cache_key: str) -> Path:
    return CACHE_DIR / f"{cache_key}.json"


def _read_cache(cache_key: str) -> dict | None:
    path = _cache_path(cache_key)
    if not path.exists():
        return None
    age = time.time() - path.stat().st_mtime
    if age > MAX_CACHE_AGE_SECONDS:
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_cache(cache_key: str, data: Any) -> None:
    path = _cache_path(cache_key)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f)


def _read_fixture(cache_key: str) -> dict | None:
    path = FIXTURE_DIR / f"{cache_key}.json"
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def fetch_with_fallback(cache_key: str, fetch_fn: Callable[[], Any]) -> dict:
    """
    Wraps a live-data fetch with cache + bundled-fixture fallback.
    Never raises. Returns {"data": ..., "source": "live"|"cache"|"fixture", "stale": bool}.

    fetch_fn: zero-arg callable that returns the live data (sync). Callers using
    an async client should wrap the call in a small sync shim before passing it in.
    """
    if is_offline_mode():
        cached = _read_cache(cache_key)
        if cached is not None:
            logger.info(f"[fallback_cache] {cache_key}: offline mode -> cache")
            return {"data": cached, "source": "cache", "stale": True}
        fixture = _read_fixture(cache_key)
        if fixture is not None:
            logger.info(f"[fallback_cache] {cache_key}: offline mode -> bundled fixture")
            return {"data": fixture, "source": "fixture", "stale": True}
        logger.warning(f"[fallback_cache] {cache_key}: offline mode, no cache or fixture available")
        return {"data": None, "source": "none", "stale": True}

    try:
        data = fetch_fn()
        _write_cache(cache_key, data)
        return {"data": data, "source": "live", "stale": False}
    except Exception as e:
        logger.warning(f"[fallback_cache] {cache_key}: live fetch failed ({e}) — falling back")

    cached = _read_cache(cache_key)
    if cached is not None:
        logger.info(f"[fallback_cache] {cache_key}: serving cache (<24h old)")
        return {"data": cached, "source": "cache", "stale": True}

    fixture = _read_fixture(cache_key)
    if fixture is not None:
        logger.info(f"[fallback_cache] {cache_key}: serving bundled fixture")
        return {"data": fixture, "source": "fixture", "stale": True}

    logger.error(f"[fallback_cache] {cache_key}: live fetch failed, no cache or fixture available")
    return {"data": None, "source": "none", "stale": True}


async def fetch_with_fallback_async(cache_key: str, fetch_coro_fn: Callable[[], Awaitable[Any]]) -> dict:
    """Same contract as fetch_with_fallback, for async fetchers (httpx.AsyncClient calls)."""
    if is_offline_mode():
        cached = _read_cache(cache_key)
        if cached is not None:
            logger.info(f"[fallback_cache] {cache_key}: offline mode -> cache")
            return {"data": cached, "source": "cache", "stale": True}
        fixture = _read_fixture(cache_key)
        if fixture is not None:
            logger.info(f"[fallback_cache] {cache_key}: offline mode -> bundled fixture")
            return {"data": fixture, "source": "fixture", "stale": True}
        logger.warning(f"[fallback_cache] {cache_key}: offline mode, no cache or fixture available")
        return {"data": None, "source": "none", "stale": True}

    try:
        data = await fetch_coro_fn()
        _write_cache(cache_key, data)
        return {"data": data, "source": "live", "stale": False}
    except Exception as e:
        logger.warning(f"[fallback_cache] {cache_key}: live fetch failed ({e}) — falling back")

    cached = _read_cache(cache_key)
    if cached is not None:
        logger.info(f"[fallback_cache] {cache_key}: serving cache (<24h old)")
        return {"data": cached, "source": "cache", "stale": True}

    fixture = _read_fixture(cache_key)
    if fixture is not None:
        logger.info(f"[fallback_cache] {cache_key}: serving bundled fixture")
        return {"data": fixture, "source": "fixture", "stale": True}

    logger.error(f"[fallback_cache] {cache_key}: live fetch failed, no cache or fixture available")
    return {"data": None, "source": "none", "stale": True}
