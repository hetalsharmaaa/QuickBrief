# backend/app/services/cache_service.py

import hashlib
import json
import time
from typing import Any, Optional

# Simple in-memory cache — no Redis needed, works out of the box
# Key: hash of request, Value: {data, timestamp}

_cache: dict = {}
CACHE_TTL = 60 * 30  # 30 minutes


def _make_key(prefix: str, data: Any) -> str:
    raw = f"{prefix}:{json.dumps(data, sort_keys=True)}"
    return hashlib.md5(raw.encode()).hexdigest()


def get(prefix: str, data: Any) -> Optional[Any]:
    key = _make_key(prefix, data)
    entry = _cache.get(key)
    if not entry:
        return None
    # Check expiry
    if time.time() - entry["ts"] > CACHE_TTL:
        del _cache[key]
        return None
    print(f"✅ Cache HIT: {prefix}")
    return entry["data"]


def set(prefix: str, data: Any, result: Any):
    key = _make_key(prefix, data)
    _cache[key] = {"data": result, "ts": time.time()}
    print(f"💾 Cache SET: {prefix}")


def clear():
    _cache.clear()
    print("🗑️ Cache cleared")


def stats() -> dict:
    return {
        "total_entries": len(_cache),
        "keys": list(_cache.keys())[:10],
    }