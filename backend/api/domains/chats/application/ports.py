"""Порты chats."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from types import TracebackType
from typing import Self
from uuid import UUID

from domains.chats.application.dto import ChatDTO, MessageDTO
from domains.chats.domain.entities import (
    Chat,
    ChatMember,
    DirectChatPair,
    Message,
    MessageAttachment,
    PlaceChat,
)


class AbstractChatsRepository(ABC):
    @abstractmethod
    async def get_chat(self, chat_id: UUID) -> Chat | None: ...

    @abstractmethod
    async def add_chat(self, chat: Chat) -> Chat: ...

    @abstractmethod
    async def get_direct_pair(self, user_a: UUID, user_b: UUID) -> DirectChatPair | None: ...

    @abstractmethod
    async def add_direct_pair(self, pair: DirectChatPair) -> DirectChatPair: ...

    @abstractmethod
    async def get_place_chat(self, place_id: UUID) -> PlaceChat | None: ...

    @abstractmethod
    async def add_place_chat(self, place_chat: PlaceChat) -> PlaceChat: ...

    @abstractmethod
    async def ensure_member(self, member: ChatMember) -> ChatMember: ...

    @abstractmethod
    async def is_member(self, chat_id: UUID, user_id: UUID) -> bool: ...

    @abstractmethod
    async def list_member_ids(self, chat_id: UUID) -> list[UUID]: ...

    @abstractmethod
    async def list_chats_for_user(self, user_id: UUID, *, limit: int = 50) -> list[Chat]: ...

    @abstractmethod
    async def get_direct_peer(self, chat_id: UUID, user_id: UUID) -> UUID | None: ...

    @abstractmethod
    async def get_place_id(self, chat_id: UUID) -> UUID | None: ...

    @abstractmethod
    async def find_by_client_message_id(
        self,
        chat_id: UUID,
        author_id: UUID,
        client_message_id: UUID,
    ) -> Message | None: ...

    @abstractmethod
    async def add_message(self, message: Message) -> Message: ...

    @abstractmethod
    async def add_attachment(self, attachment: MessageAttachment) -> MessageAttachment: ...

    @abstractmethod
    async def list_attachments_for_messages(
        self,
        message_ids: list[UUID],
    ) -> dict[UUID, list[MessageAttachment]]: ...

    @abstractmethod
    async def map_user_briefs(
        self,
        user_ids: list[UUID],
    ) -> dict[UUID, tuple[str, str | None, str | None]]:
        """author_id → (username, display_name, avatar_url)."""

    @abstractmethod
    async def get_message(self, message_id: UUID) -> Message | None: ...

    @abstractmethod
    async def save_message(self, message: Message) -> Message: ...

    @abstractmethod
    async def list_messages(
        self,
        chat_id: UUID,
        *,
        before_id: UUID | None = None,
        limit: int = 50,
    ) -> list[Message]: ...

    @abstractmethod
    async def mark_read(
        self,
        chat_id: UUID,
        user_id: UUID,
        message_id: UUID,
    ) -> None: ...

    @abstractmethod
    async def touch_last_message(self, chat_id: UUID, when: datetime) -> None: ...

    @abstractmethod
    async def list_reactions_for_messages(
        self,
        message_ids: list[UUID],
    ) -> dict[UUID, list[tuple[str, UUID, datetime]]]: ...

    @abstractmethod
    async def get_user_reaction(self, message_id: UUID, user_id: UUID) -> str | None: ...

    @abstractmethod
    async def upsert_reaction(
        self,
        *,
        message_id: UUID,
        user_id: UUID,
        emoji: str,
        when: datetime,
    ) -> None: ...

    @abstractmethod
    async def delete_reaction(self, message_id: UUID, user_id: UUID) -> None: ...


class AbstractChatsUnitOfWork(ABC):
    chats: AbstractChatsRepository

    @abstractmethod
    async def __aenter__(self) -> Self: ...

    @abstractmethod
    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None: ...

    @abstractmethod
    async def commit(self) -> None: ...

    @abstractmethod
    async def rollback(self) -> None: ...


class AbstractChatsService(ABC):
    @abstractmethod
    async def get_or_create_direct(self, user_id: UUID, peer_id: UUID) -> ChatDTO: ...

    @abstractmethod
    async def get_or_create_place_chat(self, user_id: UUID, place_id: UUID) -> ChatDTO: ...

    @abstractmethod
    async def list_chats(self, user_id: UUID) -> list[ChatDTO]: ...

    @abstractmethod
    async def list_messages(
        self,
        user_id: UUID,
        chat_id: UUID,
        *,
        before_id: UUID | None = None,
        limit: int = 50,
    ) -> list[MessageDTO]: ...

    @abstractmethod
    async def list_member_ids(self, chat_id: UUID) -> list[UUID]: ...

    @abstractmethod
    async def send_message(
        self,
        user_id: UUID,
        chat_id: UUID,
        *,
        body: str,
        client_message_id: UUID | None = None,
        reply_to_id: UUID | None = None,
        attachments: list[dict] | None = None,
    ) -> MessageDTO: ...

    @abstractmethod
    async def mark_read(self, user_id: UUID, chat_id: UUID, message_id: UUID) -> None: ...

    @abstractmethod
    async def soft_delete_message(self, user_id: UUID, message_id: UUID) -> MessageDTO: ...

    @abstractmethod
    async def set_reaction(
        self,
        user_id: UUID,
        message_id: UUID,
        emoji: str,
    ) -> MessageDTO: ...

    @abstractmethod
    async def assert_member(self, user_id: UUID, chat_id: UUID) -> None: ...
