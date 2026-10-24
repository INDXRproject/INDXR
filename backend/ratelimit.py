"""
IP rate limiting for anonymous Railway endpoints, via Upstash Redis.

growth-plan.md §6.2 Onderdeel B: "Voorproefjes zonder account rate-limiten per IP via Upstash,
ook op het Railway-endpoint zelf (dat heeft nu geen eigen limiet)." Next.js already has Upstash
wired (packages/shared/src/lib/ratelimit.ts) but that's a separate process — this mirrors the
same optional/no-op behaviour (missing env vars => rate limiting disabled, not a hard failure).
Uses the SAME upstash_redis.asyncio client main.py already depends on for the caption cache
(get_caption_redis) rather than adding a new HTTP client — one fixed-window counter via
INCR + EXPIRE(NX).
"""
import hashlib
import logging
import os
from typing import Optional

from upstash_redis.asyncio import Redis as UpstashRedis

logger = logging.getLogger("indxr-ratelimit")

_redis: Optional[UpstashRedis] = None
_redis_checked = False


def _get_redis() -> Optional[UpstashRedis]:
    global _redis, _redis_checked
    if _redis_checked:
        return _redis
    _redis_checked = True
    url = os.getenv("UPSTASH_REDIS_REST_URL")
    token = os.getenv("UPSTASH_REDIS_REST_TOKEN")
    if url and token:
        _redis = UpstashRedis(url=url, token=token)
    else:
        logger.warning(
            "UPSTASH_REDIS_REST_URL/_TOKEN not set — Railway-side IP rate limiting disabled "
            "(local dev / not yet configured). Do not rely on this in production without it."
        )
    return _redis


async def check_ip_rate_limit(ip: str, bucket: str, max_requests: int, window_seconds: int) -> bool:
    """Fixed-window counter. Returns True if the request is allowed, False if the limit is
    exceeded. No-op (always allowed) when Upstash env vars are absent, matching the Next.js
    noopLimiter — local dev isn't blocked without Redis configured."""
    redis = _get_redis()
    if redis is None:
        return True

    key = f"indxr-backend-ratelimit:{bucket}:{ip}"
    try:
        count = await redis.incr(key)
        if count == 1:
            # Only set the TTL on the first hit in this window — NX avoids resetting the
            # expiry on every subsequent request (which would let a steady stream of requests
            # never actually expire the window).
            await redis.expire(key, window_seconds, nx=True)
        return int(count) <= max_requests
    except Exception as e:
        # Fail-open: a Redis hiccup must not take down the quote-create endpoint. Logged so a
        # structural Upstash outage is visible, but never blocks a legitimate anonymous visitor.
        logger.warning(f"check_ip_rate_limit failed (failing open): {e}")
        return True


def client_ip_from_request(request_headers, fallback: str) -> str:
    """Best-effort real client IP behind Railway's proxy (X-Forwarded-For is set by the edge)."""
    xff = request_headers.get("x-forwarded-for") or request_headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    return fallback


def hash_ip(ip: str) -> str:
    """One-way hash for `quick_quotes.ip_hash` — abuse-limit lookups without storing a raw IP."""
    salt = os.getenv("IP_HASH_SALT", "indxr-quick-quote-ip-salt")
    return hashlib.sha256(f"{salt}:{ip}".encode("utf-8")).hexdigest()[:32]
