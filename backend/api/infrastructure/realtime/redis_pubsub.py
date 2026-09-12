"""Асинхронная обёртка Redis pub/sub."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

from redis.asyncio import Redis

from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)


class RedisPubSub:
    """Подключение, публикация JSON и подписка на каналы."""

    def __init__(self, redis: Redis | None = None) -> None:
        self._redis = redis
        self._owned = redis is None

    async def connect(self) -> Redis:
        if self._redis is None:
            self._redis = Redis(
                host=settings.redis.HOST,
                port=settings.redis.PORT,
                decode_responses=True,
            )
        return self._redis

    async def close(self) -> None:
        if self._owned and self._redis is not None:
            await self._redis.aclose()
            self._redis = None

    async def publish(self, channel: str, message: str | dict[str, Any]) -> int:
        client = await self.connect()
        payload = message if isinstance(message, str) else json.dumps(message, default=str)
        try:
            return int(await client.publish(channel, payload))
        except Exception:
            logger.exception("redis.publish failed channel=%s", channel)
            return 0

    async def subscribe(self, *channels: str) -> AsyncIterator[tuple[str, dict[str, Any] | str]]:
        """Итератор (channel, payload). Payload — dict если JSON, иначе строка."""
        client = await self.connect()
        pubsub = client.pubsub()
        await pubsub.subscribe(*channels)
        try:
            async for raw in pubsub.listen():
                if raw is None or raw.get("type") != "message":
                    continue
                channel = raw.get("channel")
                data = raw.get("data")
                if isinstance(channel, bytes):
                    channel = channel.decode()
                if isinstance(data, bytes):
                    data = data.decode()
                parsed: dict[str, Any] | str = data
                if isinstance(data, str):
                    try:
                        loaded = json.loads(data)
                        if isinstance(loaded, dict):
                            parsed = loaded
                    except json.JSONDecodeError:
                        parsed = data
                yield str(channel), parsed
        finally:
            await pubsub.unsubscribe(*channels)
            await pubsub.aclose()
