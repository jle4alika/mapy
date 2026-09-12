"""Менеджер WebSocket-соединений по user_id."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import WebSocket
from starlette.websockets import WebSocketState

from core.logging import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    """In-memory реестр активных сокетов пользователя."""

    def __init__(self) -> None:
        self._connections: dict[UUID, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[user_id].add(websocket)
        logger.info("ws.connect user_id=%s", user_id)

    async def disconnect(self, user_id: UUID, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self._connections.get(user_id)
            if not sockets:
                return
            sockets.discard(websocket)
            if not sockets:
                self._connections.pop(user_id, None)
        logger.info("ws.disconnect user_id=%s", user_id)

    async def send_json(self, user_id: UUID, payload: dict[str, Any]) -> None:
        async with self._lock:
            sockets = list(self._connections.get(user_id, set()))
        for ws in sockets:
            if ws.client_state != WebSocketState.CONNECTED:
                continue
            try:
                await ws.send_json(payload)
            except Exception:
                logger.exception("ws.send failed user_id=%s", user_id)

    async def broadcast(self, user_ids: list[UUID], payload: dict[str, Any]) -> None:
        for uid in user_ids:
            await self.send_json(uid, payload)


connection_manager = ConnectionManager()
