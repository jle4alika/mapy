"""Сущности чатов."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import ClassVar, Literal
from uuid import UUID

from domains.chats.domain.errors import InvalidMessageError
from domains.friends.domain.entities import ordered_pair

ChatKind = Literal["direct", "place"]
MemberRole = Literal["member", "admin"]


@dataclass(slots=True, kw_only=True)
class Chat:
    id: UUID
    kind: ChatKind
    created_at: datetime | None = None
    last_message_at: datetime | None = None


@dataclass(slots=True, kw_only=True)
class DirectChatPair:
    chat_id: UUID
    user_low_id: UUID
    user_high_id: UUID

    @classmethod
    def of(cls, chat_id: UUID, user_a: UUID, user_b: UUID) -> DirectChatPair:
        low, high = ordered_pair(user_a, user_b)
        return cls(chat_id=chat_id, user_low_id=low, user_high_id=high)


@dataclass(slots=True, kw_only=True)
class PlaceChat:
    chat_id: UUID
    place_id: UUID


@dataclass(slots=True, kw_only=True)
class ChatMember:
    chat_id: UUID
    user_id: UUID
    role: MemberRole = "member"
    joined_at: datetime | None = None
    last_read_message_id: UUID | None = None


@dataclass(slots=True, kw_only=True)
class Message:
    MAX_BODY: ClassVar[int] = 4000

    id: UUID
    chat_id: UUID
    author_id: UUID
    body: str
    client_message_id: UUID | None = None
    reply_to_id: UUID | None = None
    deleted_at: datetime | None = None
    created_at: datetime | None = None

    @classmethod
    def create(
        cls,
        *,
        id: UUID,
        chat_id: UUID,
        author_id: UUID,
        body: str,
        client_message_id: UUID | None = None,
        reply_to_id: UUID | None = None,
        has_attachment: bool = False,
    ) -> Message:
        text = (body or "").strip()
        if not text and not has_attachment:
            raise InvalidMessageError(f"Текст: 1–{cls.MAX_BODY} символов")
        if len(text) > cls.MAX_BODY:
            raise InvalidMessageError(f"Текст: 1–{cls.MAX_BODY} символов")
        return cls(
            id=id,
            chat_id=chat_id,
            author_id=author_id,
            body=text,
            client_message_id=client_message_id,
            reply_to_id=reply_to_id,
        )

    def soft_delete(self, *, by_user_id: UUID, when: datetime) -> None:
        if self.author_id != by_user_id:
            raise InvalidMessageError("Можно удалить только своё сообщение")
        self.deleted_at = when


@dataclass(slots=True, kw_only=True)
class MessageAttachment:
    id: UUID
    message_id: UUID
    kind: Literal["image", "video", "audio", "file"]
    url: str
    mime: str | None = None
    size_bytes: int | None = None
