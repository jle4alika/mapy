"""
Redis: кэш fastapi-cache2, rate limiting (pyrate_limiter), middlewares.
"""

from __future__ import annotations


from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager
from functools import lru_cache
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.backends.redis import RedisBackend
from pyrate_limiter import Duration, Limiter, Rate
from pyrate_limiter.buckets import RedisBucket
from redis.asyncio import Redis
from starlette.responses import Response

from infrastructure.cache import key_builder
from core.config import settings
from core.logging import get_logger

logging = get_logger(__name__)

rate_limiter: Limiter | None = None
_named_limiters: dict[str, Limiter] = {}


@lru_cache
def get_redis() -> Redis:
    """Клиент Redis (bytes; совместим с fastapi-cache и pyrate_limiter)."""

    return Redis(
        host=settings.redis.HOST,
        port=settings.redis.PORT,
        decode_responses=False,
    )


async def _get_or_create_named_limiter(
    scope: str,
    limit: int,
    window_seconds: int,
) -> Limiter:
    """Лимитер с именованным scope (для Depends на отдельных ручках)."""

    cache_key = f"{scope}:{limit}:{window_seconds}"
    if cache_key in _named_limiters:
        return _named_limiters[cache_key]

    redis = get_redis()
    rates = [Rate(limit, Duration.SECOND * window_seconds)]
    bucket = await RedisBucket.init(rates, redis, f"rate-limit:{scope}")
    limiter = Limiter(bucket)
    _named_limiters[cache_key] = limiter
    return limiter


def rate_limiter_factory(
    scope: str,
    limit: int,
    window_seconds: int,
) -> Callable:
    """
    FastAPI dependency: не более `limit` запросов за `window_seconds` на IP.

    Пример: dependencies=[Depends(rate_limiter_factory("register", 10, 3600))]
    Без Redis (глобальный limiter не инициализирован) — no-op.
    """

    async def _check(request: Request) -> None:
        if not settings.rate_limit.ENABLED:
            return
        try:
            limiter = await _get_or_create_named_limiter(scope, limit, window_seconds)
        except Exception:
            logging.warning("named_rate_limiter_unavailable scope=%s", scope)
            return
        client_ip = _client_ip(request)
        key = f"{scope}:{client_ip}"
        allowed = await limiter.try_acquire_async(key, blocking=False)
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail="Слишком много запросов. Попробуйте позже.",
            )

    return _check


@asynccontextmanager
async def redis_lifespan(app: FastAPI):
    """Lifespan: ping Redis, инициализация кэша и глобального лимитера."""

    global rate_limiter

    redis = get_redis()
    redis_enabled = False

    try:
        logging.info("Проверка соединения с Redis...")
        await redis.ping()
        logging.info("Redis работает")
        redis_enabled = True
    except Exception as exc:
        if settings.redis.OPTIONAL:
            logging.warning(
                "Redis недоступен (%s): кэш и rate limit отключены",
                exc,
            )
        else:
            raise

    if redis_enabled:
        FastAPICache.init(
            RedisBackend(redis),
            prefix="fastapi-cache",
            expire=settings.cache.EXPIRE_SECONDS,
            key_builder=key_builder,
            enable=True,
        )
        if settings.rate_limit.ENABLED:
            rates = [
                Rate(
                    settings.rate_limit.GLOBAL_LIMIT,
                    Duration.SECOND * settings.rate_limit.GLOBAL_WINDOW_SECONDS,
                ),
            ]
            redis_bucket = await RedisBucket.init(rates, redis, "api-rate-limits")
            rate_limiter = Limiter(redis_bucket)
        else:
            rate_limiter = None
            logging.info("Глобальный rate limit отключён (RATE_LIMIT_ENABLED=false)")
    else:
        # Чтобы @cache на ручках не падал без Redis
        FastAPICache.init(
            InMemoryBackend(),
            prefix="fastapi-cache",
            key_builder=key_builder,
            enable=False,
        )

    yield

    if redis_enabled:
        await redis.aclose()
        _named_limiters.clear()
        logging.info("Redis отключен")


def get_rate_limiter() -> Limiter | None:
    return rate_limiter


_RATE_LIMIT_SKIP_PREFIXES = (
    "/health",
    "/metrics",
    "/api/docs",
    "/api/openapi.json",
)


def _client_ip(request: Request) -> str:
    """
    IP клиента для rate limit.

    X-Forwarded-For учитывается только при TRUST_PROXY_HEADERS=true
    (иначе заголовок легко подделать).
    """
    if settings.TRUST_PROXY_HEADERS:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


async def rate_limit_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Глобальный лимит на IP (настройки RATE_LIMIT_*)."""

    if not settings.rate_limit.ENABLED:
        return await call_next(request)

    path = request.url.path
    if path.startswith(_RATE_LIMIT_SKIP_PREFIXES):
        return await call_next(request)

    limiter = get_rate_limiter()
    if limiter is None:
        return await call_next(request)

    # На IP целиком (не IP+path): иначе мобильные за NAT душатся на одном path
    rate_limit_key = f"ip:{_client_ip(request)}"
    allowed = await limiter.try_acquire_async(rate_limit_key, blocking=False)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Слишком много запросов. Попробуйте позже.",
                "code": "rate_limit",
            },
        )

    return await call_next(request)
