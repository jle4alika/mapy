"""Публикация presence сразу в WebSocket друзей (in-process)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from domains.location.application.ports import AbstractPresencePublisher
from infrastructure.realtime.connection_manager import connection_manager


class WsPresencePublisher(AbstractPresencePublisher):
    """Доставка friend.location онлайн-друзьям через connection_manager."""

    async def publish_friend_location(
        self,
        *,
        friend_ids: list[UUID],
        payload: dict[str, Any],
    ) -> None:
        if not friend_ids:
            return
        # payload уже полный WS-фрейм {type, payload} или только data — нормализуем
        frame = payload if payload.get("type") else {"type": "friend.location", "payload": payload}
        await connection_manager.broadcast(friend_ids, frame)
