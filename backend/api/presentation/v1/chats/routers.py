"""HTTP-ручки чатов."""

from __future__ import annotations

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, File, Query, UploadFile
from pydantic import BaseModel, Field, model_validator

from common.exceptions.errors import AppError
from domains.chats.application.dto import ChatDTO, MessageDTO
from domains.users.infrastructure.auth import CurrentActiveUser
from infrastructure.dependencies.rate_limiter import rate_limiter_factory
from infrastructure.realtime.connection_manager import connection_manager
from presentation.v1.chats.dependencies import ChatsServiceDep

chats_router = APIRouter(prefix="/chats", tags=["chats"])
place_chat_router = APIRouter(prefix="/places", tags=["chats"])
messages_router = APIRouter(tags=["chats"])

MAX_CHAT_MEDIA_BYTES = 40 * 1024 * 1024


class CreateDirectChatBody(BaseModel):
    peer_user_id: uuid.UUID


class AttachmentIn(BaseModel):
    kind: Literal["image", "video", "audio", "file"]
    url: str = Field(..., min_length=1, max_length=1024)
    mime: str | None = Field(default=None, max_length=128)
    size_bytes: int | None = Field(default=None, ge=0)


class SendMessageBody(BaseModel):
    body: str = Field(default="", max_length=4000)
    client_message_id: uuid.UUID | None = None
    reply_to_id: uuid.UUID | None = None
    attachments: list[AttachmentIn] = Field(default_factory=list, max_length=4)

    @model_validator(mode="after")
    def require_content(self) -> SendMessageBody:
        if not (self.body or "").strip() and not self.attachments:
            raise ValueError("Нужен текст или вложение")
        return self


class MarkReadBody(BaseModel):
    message_id: uuid.UUID


class UploadedMediaDTO(BaseModel):
    url: str
    kind: Literal["image", "video", "audio", "file"]
    mime: str | None = None
    size_bytes: int | None = None


def _kind_from_mime(content_type: str) -> Literal["image", "video", "audio", "file"]:
    if content_type.startswith("image/"):
        return "image"
    if content_type.startswith("video/"):
        return "video"
    if content_type.startswith("audio/"):
        return "audio"
    return "file"


def _ext_for(content_type: str, kind: str) -> str:
    mapping = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/quicktime": "mov",
        "audio/mpeg": "mp3",
        "audio/mp4": "m4a",
        "audio/webm": "webm",
        "audio/wav": "wav",
        "audio/x-wav": "wav",
        "audio/ogg": "ogg",
    }
    if content_type in mapping:
        return mapping[content_type]
    return {"image": "jpg", "video": "mp4", "audio": "m4a"}.get(kind, "bin")


def _payload_attachments(msg: MessageDTO) -> list[dict]:
    return [
        {
            "id": str(a.id),
            "kind": a.kind,
            "url": a.url,
            "mime": a.mime,
            "size_bytes": a.size_bytes,
        }
        for a in msg.attachments
    ]


@chats_router.get("", response_model=list[ChatDTO])
async def list_chats(
    user: CurrentActiveUser,
    service: ChatsServiceDep,
) -> list[ChatDTO]:
    return await service.list_chats(user.id)


@chats_router.post("/direct", response_model=ChatDTO)
async def create_direct(
    body: CreateDirectChatBody,
    user: CurrentActiveUser,
    service: ChatsServiceDep,
) -> ChatDTO:
    return await service.get_or_create_direct(user.id, body.peer_user_id)


@chats_router.get("/{chat_id}/messages", response_model=list[MessageDTO])
async def list_messages(
    chat_id: uuid.UUID,
    user: CurrentActiveUser,
    service: ChatsServiceDep,
    before_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
) -> list[MessageDTO]:
    return await service.list_messages(user.id, chat_id, before_id=before_id, limit=limit)


@chats_router.post(
    "/{chat_id}/media",
    response_model=UploadedMediaDTO,
    dependencies=[Depends(rate_limiter_factory("chat_media", 30, 60))],
)
async def upload_chat_media(
    chat_id: uuid.UUID,
    user: CurrentActiveUser,
    service: ChatsServiceDep,
    file: UploadFile = File(...),
) -> UploadedMediaDTO:
    """Загрузка вложения (фото / видео / аудио / файл) для сообщения в чате."""
    from infrastructure.storage.local import local_object_storage

    await service.assert_member(user.id, chat_id)
    content_type = (file.content_type or "application/octet-stream").lower()
    kind = _kind_from_mime(content_type)
    data = await file.read()
    if not data:
        raise AppError("Пустой файл")
    if len(data) > MAX_CHAT_MEDIA_BYTES:
        raise AppError("Файл больше 40 МБ")
    # Сохраняем исходное расширение, если MIME не из whitelist
    raw_name = (file.filename or "").rsplit(".", 1)
    client_ext = raw_name[-1].lower()[:12] if len(raw_name) > 1 else ""
    ext = _ext_for(content_type, kind)
    if kind == "file" and client_ext and client_ext.isalnum():
        ext = client_ext
    key = f"chat-media/{chat_id}/{uuid.uuid4().hex}.{ext}"
    url = await local_object_storage.save(key=key, data=data, content_type=content_type)
    # Клиенту — путь /media/..., чтобы не зависеть от порта PUBLIC_BASE_URL
    if "/media/" in url:
        url = "/media/" + url.split("/media/", 1)[1]
    return UploadedMediaDTO(url=url, kind=kind, mime=content_type, size_bytes=len(data))


@chats_router.post(
    "/{chat_id}/messages",
    response_model=MessageDTO,
    dependencies=[Depends(rate_limiter_factory("chat_message", 120, 60))],
)
async def send_message(
    chat_id: uuid.UUID,
    body: SendMessageBody,
    user: CurrentActiveUser,
    service: ChatsServiceDep,
) -> MessageDTO:
    msg = await service.send_message(
        user.id,
        chat_id,
        body=body.body,
        client_message_id=body.client_message_id,
        reply_to_id=body.reply_to_id,
        attachments=[a.model_dump() for a in body.attachments],
    )
    member_ids = await service.list_member_ids(chat_id)
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
            "attachments": _payload_attachments(msg),
        },
    }
    await connection_manager.broadcast(member_ids, frame)
    notify_body = (msg.body or "")[:120]
    if not notify_body and msg.attachments:
        notify_body = msg.attachments[0].kind
    notify = {
        "type": "notification",
        "payload": {
            "kind": "message",
            "title": "Новое сообщение",
            "body": notify_body,
            "chat_id": str(msg.chat_id),
            "from_user_id": str(msg.author_id),
        },
    }
    await connection_manager.broadcast(
        [m for m in member_ids if m != user.id],
        notify,
    )
    return msg


@chats_router.post("/{chat_id}/read", status_code=204)
async def mark_read(
    chat_id: uuid.UUID,
    body: MarkReadBody,
    user: CurrentActiveUser,
    service: ChatsServiceDep,
) -> None:
    await service.mark_read(user.id, chat_id, body.message_id)
    member_ids = await service.list_member_ids(chat_id)
    frame = {
        "type": "read.update",
        "payload": {
            "chat_id": str(chat_id),
            "user_id": str(user.id),
            "message_id": str(body.message_id),
        },
    }
    await connection_manager.broadcast([m for m in member_ids if m != user.id], frame)


@place_chat_router.post("/{place_id}/chat", response_model=ChatDTO)
async def place_chat(
    place_id: uuid.UUID,
    user: CurrentActiveUser,
    service: ChatsServiceDep,
) -> ChatDTO:
    return await service.get_or_create_place_chat(user.id, place_id)


@messages_router.delete("/messages/{message_id}", response_model=MessageDTO)
async def delete_message(
    message_id: uuid.UUID,
    user: CurrentActiveUser,
    service: ChatsServiceDep,
) -> MessageDTO:
    msg = await service.soft_delete_message(user.id, message_id)
    member_ids = await service.list_member_ids(msg.chat_id)
    frame = {
        "type": "message.deleted",
        "payload": {"id": str(msg.id), "chat_id": str(msg.chat_id)},
    }
    await connection_manager.broadcast(member_ids, frame)
    return msg


class SetReactionBody(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=32)


@messages_router.post("/messages/{message_id}/reactions", response_model=MessageDTO)
async def set_reaction(
    message_id: uuid.UUID,
    body: SetReactionBody,
    user: CurrentActiveUser,
    service: ChatsServiceDep,
) -> MessageDTO:
    msg = await service.set_reaction(user.id, message_id, body.emoji)
    member_ids = await service.list_member_ids(msg.chat_id)
    await connection_manager.broadcast(
        member_ids,
        {
            "type": "message.reaction",
            "payload": {
                "id": str(msg.id),
                "chat_id": str(msg.chat_id),
                "user_id": str(user.id),
                "reactions": [{"emoji": r.emoji, "count": r.count} for r in msg.reactions],
            },
        },
    )
    return msg
