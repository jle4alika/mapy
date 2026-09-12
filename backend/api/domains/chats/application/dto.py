"""DTO chats."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field

from common.schemas.base import BaseDTO


class ChatDTO(BaseDTO):
    id: uuid.UUID
    kind: Literal["direct", "place"]
    last_message_at: datetime | None = None
    peer_user_id: uuid.UUID | None = None
    place_id: uuid.UUID | None = None
    title: str | None = None


class MessageAttachmentDTO(BaseDTO):
    id: uuid.UUID
    kind: Literal["image", "video", "audio", "file"]
    url: str
    mime: str | None = None
    size_bytes: int | None = None


class MessageReactionDTO(BaseDTO):
    emoji: str
    count: int
    me: bool = False


class MessageDTO(BaseDTO):
    id: uuid.UUID
    chat_id: uuid.UUID
    author_id: uuid.UUID
    author_username: str | None = None
    author_display_name: str | None = None
    author_avatar_url: str | None = None
    body: str | None = None
    client_message_id: uuid.UUID | None = None
    reply_to_id: uuid.UUID | None = None
    deleted_at: datetime | None = None
    created_at: datetime | None = None
    attachments: list[MessageAttachmentDTO] = Field(default_factory=list)
    reactions: list[MessageReactionDTO] = Field(default_factory=list)
