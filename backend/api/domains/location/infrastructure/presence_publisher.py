"""Публикация presence через Redis (реализация порта)."""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from domains.location.application.ports import AbstractPresencePublisher
from infrastructure.realtime.redis_pubsub import RedisPubSub


class RedisPresencePublisher(AbstractPresencePublisher):
    def __init__(self, pubsub: RedisPubSub | None = None) -> None:
        self._pubsub = pubsub or RedisPubSub()

    async def publish_friend_location(
        self,
        *,
        friend_ids: list[UUID],
        payload: dict[str, Any],
    ) -> None:
        body = json.dumps(payload, default=str)
        for fid in friend_ids:
            await self._pubsub.publish(f"presence:friends:{fid}", body)
