"""
Rate limit через pyrate_limiter (см. infrastructure.redis.rate_limiter).

Для лимита на конкретную ручку используйте:
  Depends(rate_limiter_factory("scope", limit, window_seconds))
"""

from infrastructure.redis.rate_limiter import rate_limiter_factory

__all__ = ["rate_limiter_factory"]
