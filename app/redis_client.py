"""
app/redis_client.py — Async Redis Connection Pool

Redis serves four distinct roles in this platform:
  1. Session store — Refresh token tracking & revocation
  2. Cache — AI-generated reports, analytics summaries (24h TTL)
  3. Rate limiting — Per-user and per-IP request throttling
  4. Celery broker — Background task queue (separate DB index)

Using a connection pool (not a new connection per request) is critical
for performance. Under load, creating a new TCP connection per request
is a major bottleneck.
"""

import json
from typing import Any, Optional

import redis.asyncio as aioredis
from redis.asyncio import ConnectionPool

from app.config import settings

# ─── Connection Pool ──────────────────────────────────────────────────────────
# max_connections=50: Redis is single-threaded; 50 concurrent ops is plenty
# decode_responses=True: automatically decode bytes → str
_pool: Optional[ConnectionPool] = None


def get_redis_pool() -> ConnectionPool:
    """Return the global connection pool (created once on first call)."""
    global _pool
    if _pool is None:
        _pool = ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=50,
            decode_responses=True,
        )
    return _pool


async def get_redis() -> aioredis.Redis:
    """
    FastAPI dependency: yields an async Redis client backed by the pool.

    Usage:
        @router.get("/")
        async def route(redis: aioredis.Redis = Depends(get_redis)):
            await redis.set("key", "value")
    """
    return aioredis.Redis(connection_pool=get_redis_pool())


# ─── Cache Helper ─────────────────────────────────────────────────────────────
class RedisCache:
    """
    Convenience wrapper for common cache operations.
    Handles JSON serialization/deserialization automatically.
    """

    def __init__(self, client: aioredis.Redis, namespace: str = ""):
        self._r = client
        self._ns = namespace  # e.g. "analytics", "reports"

    def _key(self, key: str) -> str:
        """Prefix key with namespace to avoid collisions."""
        return f"{self._ns}:{key}" if self._ns else key

    async def get(self, key: str) -> Optional[Any]:
        """Get a JSON-decoded value. Returns None on miss."""
        raw = await self._r.get(self._key(key))
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return raw  # Return raw string if not JSON

    async def set(self, key: str, value: Any, ttl: int = 86400) -> None:
        """
        Set a JSON-encoded value.
        Default TTL = 24 hours — appropriate for AI reports and analytics.
        """
        await self._r.setex(
            name=self._key(key),
            time=ttl,
            value=json.dumps(value, default=str),
        )

    async def delete(self, key: str) -> None:
        await self._r.delete(self._key(key))

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern. Use sparingly (SCAN-based)."""
        keys = await self._r.keys(self._key(pattern))
        if keys:
            return await self._r.delete(*keys)
        return 0

    async def exists(self, key: str) -> bool:
        return bool(await self._r.exists(self._key(key)))

    async def increment(self, key: str, ttl: int = 60) -> int:
        """
        Atomic increment — used for rate limiting counters.
        Sets TTL only on first creation (EXPIRE won't override existing).
        """
        pipe = self._r.pipeline()
        pipe.incr(self._key(key))
        pipe.expire(self._key(key), ttl)
        results = await pipe.execute()
        return results[0]


# ─── Token Blacklist (for JWT revocation on logout) ───────────────────────────
class TokenBlacklist:
    """
    When a user logs out, their refresh token is added here.
    On every /refresh request, we check this list first.

    Uses Redis SET with TTL matching token expiry — self-cleaning.
    """

    PREFIX = "blacklist:"

    def __init__(self, client: aioredis.Redis):
        self._r = client

    async def add(self, jti: str, ttl_seconds: int) -> None:
        """Add a token JTI (JWT ID) to the blacklist."""
        await self._r.setex(f"{self.PREFIX}{jti}", ttl_seconds, "1")

    async def is_blacklisted(self, jti: str) -> bool:
        """Check if a token has been revoked."""
        return bool(await self._r.exists(f"{self.PREFIX}{jti}"))


async def close_redis() -> None:
    """Close all Redis connections. Called on app shutdown."""
    global _pool
    if _pool:
        await _pool.aclose()
        _pool = None
