"""WebSocket-шлюз /ws/gateway."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import uuid
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from common.exceptions.errors import AppError
from core.config import settings
from core.logging import get_logger
from domains.chats.application.service import ChatsService
from domains.chats.infrastructure.uow import ChatsUnitOfWork
from domains.chats.domain.errors import NotChatMemberError
from domains.friends.infrastructure.uow import FriendsUnitOfWork
from domains.location.application.service import LocationService
from domains.location.infrastructure.uow import LocationUnitOfWork
from domains.location.infrastructure.ws_presence_publisher import WsPresencePublisher
from domains.places.infrastructure.uow import PlacesUnitOfWork
from domains.users.infrastructure.uow import UserUnitOfWork
from infrastructure.postgres.session import session_maker
from infrastructure.realtime.connection_manager import connection_manager

logger = get_logger(__name__)

router = APIRouter(tags=["realtime"])

# Скользящее окно: не больше N кадров за WINDOW секунд на соединение
_MAX_FRAMES_PER_WINDOW = 60
_FRAME_WINDOW_SECONDS = 10.0


def _b64url_decode(segment: str) -> bytes:
    padding = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(segment + padding)


def _user_id_from_token(token: str) -> uuid.UUID | None:
    """Разбор JWT (HS256): подпись + срок действия + sub."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode()
        expected = hmac.new(
            settings.jwt.SECRET_KEY.encode(),
            signing_input,
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(expected, _b64url_decode(sig_b64)):
            return None
        payload = json.loads(_b64url_decode(payload_b64))
        exp = payload.get("exp")
        if exp is not None:
            # fastapi-users кладёт unix timestamp
            if float(exp) < datetime.now(tz=UTC).timestamp():
                return None
        sub = payload.get("sub")
        if not sub:
            return None
        return uuid.UUID(str(sub))
    except (ValueError, TypeError, json.JSONDecodeError, KeyError):
        return None


async def _handle_location_update(user_id: uuid.UUID, payload: dict[str, Any]) -> dict[str, Any]:
    recorded_raw = payload.get("recorded_at")
    recorded_at = None
    if isinstance(recorded_raw, str):
        recorded_at = datetime.fromisoformat(recorded_raw.replace("Z", "+00:00")).replace(
            tzinfo=None
        )
    async with session_maker() as session:
        friends_uow = FriendsUnitOfWork(session)
        service = LocationService(
            LocationUnitOfWork(session),
            friends_uow,
            UserUnitOfWork(session),
            presence=WsPresencePublisher(),
        )
        dto = await service.upsert_location(
            user_id,
            lat=float(payload["lat"]),
            lon=float(payload["lon"]),
            accuracy_m=payload.get("accuracy_m"),
            speed_mps=payload.get("speed_mps"),
            heading_deg=payload.get("heading_deg"),
            battery_percent=payload.get("battery_percent"),
            is_moving=bool(payload.get("is_moving", False)),
            recorded_at=recorded_at,
        )
        return {
            "ok": True,
            "client_seq": payload.get("client_seq"),
            "derived_status": dto.derived_status,
        }


async def _member_user_ids(chat_id: UUID) -> list[UUID]:
    async with session_maker() as session:
        uow = ChatsUnitOfWork(session)
        return await uow.chats.list_member_ids(chat_id)


async def _handle_message_send(user_id: uuid.UUID, payload: dict[str, Any]) -> dict[str, Any]:
    chat_id = UUID(str(payload["chat_id"]))
    body = str(payload["body"])
    client_message_id = payload.get("client_message_id")
    client_uuid = UUID(str(client_message_id)) if client_message_id else None
    reply_to = payload.get("reply_to_id")
    reply_uuid = UUID(str(reply_to)) if reply_to else None

    async with session_maker() as session:
        service = ChatsService(
            ChatsUnitOfWork(session),
            FriendsUnitOfWork(session),
            PlacesUnitOfWork(session),
        )
        msg = await service.send_message(
            user_id,
            chat_id,
            body=body,
            client_message_id=client_uuid,
            reply_to_id=reply_uuid,
        )

    frame = {
        "type": "message.new",
        "payload": {
            "id": str(msg.id),
            "chat_id": str(msg.chat_id),
            "author_id": str(msg.author_id),
            "body": msg.body,
            "client_message_id": str(msg.client_message_id) if msg.client_message_id else None,
            "reply_to_id": str(msg.reply_to_id) if msg.reply_to_id else None,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        },
    }
    member_ids = await _member_user_ids(chat_id)
    await connection_manager.broadcast(member_ids, frame)

    async with session_maker() as session:
        service = ChatsService(
            ChatsUnitOfWork(session),
            FriendsUnitOfWork(session),
            PlacesUnitOfWork(session),
        )
        chat_kind = await service.get_chat_kind(chat_id)
    preference = "place_chat_activity" if chat_kind == "place" else "dm_enabled"
    kind = "place_message" if chat_kind == "place" else "message"
    title = "Чат места" if chat_kind == "place" else "Новое сообщение"
    from infrastructure.notifications.push import deliver_app_notification

    await deliver_app_notification(
        [m for m in member_ids if m != user_id],
        preference=preference,
        kind=kind,
        title=title,
        body=(msg.body or "Вложение")[:120],
        data={
            "chat_id": str(msg.chat_id),
            "from_user_id": str(msg.author_id),
        },
    )
    return {
        "ok": True,
        "id": str(msg.id),
        "client_message_id": str(msg.client_message_id) if msg.client_message_id else None,
    }


async def _handle_typing(user_id: uuid.UUID, payload: dict[str, Any]) -> None:
    chat_id = UUID(str(payload["chat_id"]))
    member_ids = await _member_user_ids(chat_id)
    if user_id not in member_ids:
        raise NotChatMemberError("Нет доступа к чату")
    frame = {
        "type": "typing",
        "payload": {"chat_id": str(chat_id), "user_id": str(user_id)},
    }
    others = [m for m in member_ids if m != user_id]
    await connection_manager.broadcast(others, frame)


async def _handle_read_update(user_id: uuid.UUID, payload: dict[str, Any]) -> dict[str, Any]:
    chat_id = UUID(str(payload["chat_id"]))
    message_id = UUID(str(payload["message_id"]))
    async with session_maker() as session:
        service = ChatsService(
            ChatsUnitOfWork(session),
            FriendsUnitOfWork(session),
            PlacesUnitOfWork(session),
        )
        await service.mark_read(user_id, chat_id, message_id)
    member_ids = await _member_user_ids(chat_id)
    frame = {
        "type": "read.update",
        "payload": {
            "chat_id": str(chat_id),
            "user_id": str(user_id),
            "message_id": str(message_id),
        },
    }
    await connection_manager.broadcast([m for m in member_ids if m != user_id], frame)
    return {"ok": True}


@router.websocket("/ws/gateway")
async def ws_gateway(
    websocket: WebSocket,
    token: str = Query(...),
) -> None:
    user_id = _user_id_from_token(token)
    if user_id is None:
        await websocket.close(code=4401)
        return

    await connection_manager.connect(user_id, websocket)
    frame_timestamps: list[float] = []
    try:
        while True:
            data: dict[str, Any] = await websocket.receive_json()
            now_ts = datetime.now(tz=UTC).timestamp()
            frame_timestamps = [t for t in frame_timestamps if now_ts - t < _FRAME_WINDOW_SECONDS]
            frame_timestamps.append(now_ts)
            if len(frame_timestamps) > _MAX_FRAMES_PER_WINDOW:
                await websocket.send_json(
                    {
                        "type": "error",
                        "payload": {
                            "detail": "Слишком много запросов. Попробуйте позже.",
                            "code": "rate_limit",
                        },
                    },
                )
                await websocket.close(code=4429)
                return

            frame_type = data.get("type")
            payload = data.get("payload") or {}

            try:
                if frame_type == "location.update":
                    ack = await _handle_location_update(user_id, payload)
                    await websocket.send_json({"type": "location.ack", "payload": ack})
                elif frame_type == "message.send":
                    ack = await _handle_message_send(user_id, payload)
                    await websocket.send_json({"type": "message.ack", "payload": ack})
                elif frame_type == "typing":
                    await _handle_typing(user_id, payload)
                    await websocket.send_json({"type": "typing.ack", "payload": {"ok": True}})
                elif frame_type == "read.update":
                    ack = await _handle_read_update(user_id, payload)
                    await websocket.send_json({"type": "read.update.ack", "payload": ack})
                elif frame_type == "ping":
                    await websocket.send_json({"type": "pong", "payload": {}})
                else:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "payload": {
                                "detail": f"Неизвестный тип кадра: {frame_type}",
                                "code": "validation_error",
                            },
                        },
                    )
            except (KeyError, TypeError, ValueError):
                await websocket.send_json(
                    {
                        "type": "error",
                        "payload": {
                            "detail": "Некорректные данные кадра",
                            "code": "validation_error",
                        },
                    },
                )
            except AppError as exc:
                await websocket.send_json(
                    {
                        "type": "error",
                        "payload": {
                            "detail": str(exc),
                            "code": getattr(exc, "code", "app_error"),
                        },
                    },
                )
            except Exception:
                logger.exception("ws_unhandled user_id=%s", user_id)
                await websocket.send_json(
                    {
                        "type": "error",
                        "payload": {
                            "detail": "Внутренняя ошибка сервера. Пожалуйста, попробуйте позже.",
                            "code": "internal_error",
                        },
                    },
                )
    except WebSocketDisconnect:
        logger.info("ws disconnected user_id=%s", user_id)
    except Exception:
        logger.exception("ws_fatal user_id=%s", user_id)
    finally:
        await connection_manager.disconnect(user_id, websocket)
