"""Репозиторий chats."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from domains.chats.application.ports import AbstractChatsRepository
from domains.chats.domain.entities import (
    Chat,
    ChatMember,
    DirectChatPair,
    Message,
    MessageAttachment,
    PlaceChat,
)
from domains.chats.infrastructure.models import (
    ChatMemberModel,
    ChatModel,
    DirectChatPairModel,
    MessageAttachmentModel,
    MessageModel,
    MessageReactionModel,
    PlaceChatModel,
)
from domains.users.infrastructure.models import UserModel

from domains.chats.infrastructure.orm_mapper import (
    attachment_to_entity,
    chat_to_entity,
    member_to_entity,
    message_to_entity,
    pair_to_entity,
    place_chat_to_entity,
)
from domains.friends.domain.entities import ordered_pair


class ChatsRepository(AbstractChatsRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_chat(self, chat_id: UUID) -> Chat | None:
        m = await self._session.get(ChatModel, chat_id)
        return chat_to_entity(m) if m else None

    async def add_chat(self, chat: Chat) -> Chat:
        m = ChatModel(id=chat.id, kind=chat.kind, last_message_at=chat.last_message_at)
        self._session.add(m)
        await self._session.flush()
        return chat_to_entity(m)

    async def get_direct_pair(self, user_a: UUID, user_b: UUID) -> DirectChatPair | None:
        low, high = ordered_pair(user_a, user_b)
        result = await self._session.execute(
            select(DirectChatPairModel).where(
                DirectChatPairModel.user_low_id == low,
                DirectChatPairModel.user_high_id == high,
            ),
        )
        m = result.scalars().one_or_none()
        return pair_to_entity(m) if m else None

    async def add_direct_pair(self, pair: DirectChatPair) -> DirectChatPair:
        m = DirectChatPairModel(
            chat_id=pair.chat_id,
            user_low_id=pair.user_low_id,
            user_high_id=pair.user_high_id,
        )
        self._session.add(m)
        await self._session.flush()
        return pair_to_entity(m)

    async def get_place_chat(self, place_id: UUID) -> PlaceChat | None:
        result = await self._session.execute(
            select(PlaceChatModel).where(PlaceChatModel.place_id == place_id),
        )
        m = result.scalars().one_or_none()
        return place_chat_to_entity(m) if m else None

    async def add_place_chat(self, place_chat: PlaceChat) -> PlaceChat:
        m = PlaceChatModel(chat_id=place_chat.chat_id, place_id=place_chat.place_id)
        self._session.add(m)
        await self._session.flush()
        return place_chat_to_entity(m)

    async def ensure_member(self, member: ChatMember) -> ChatMember:
        existing = await self._session.get(
            ChatMemberModel,
            {"chat_id": member.chat_id, "user_id": member.user_id},
        )
        if existing is not None:
            return member_to_entity(existing)
        m = ChatMemberModel(
            chat_id=member.chat_id,
            user_id=member.user_id,
            role=member.role,
        )
        self._session.add(m)
        await self._session.flush()
        return member_to_entity(m)

    async def is_member(self, chat_id: UUID, user_id: UUID) -> bool:
        m = await self._session.get(ChatMemberModel, {"chat_id": chat_id, "user_id": user_id})
        return m is not None

    async def list_member_ids(self, chat_id: UUID) -> list[UUID]:
        result = await self._session.execute(
            select(ChatMemberModel.user_id).where(ChatMemberModel.chat_id == chat_id),
        )
        return list(result.scalars().all())

    async def list_chats_for_user(self, user_id: UUID, *, limit: int = 50) -> list[Chat]:
        result = await self._session.execute(
            select(ChatModel)
            .join(ChatMemberModel, ChatMemberModel.chat_id == ChatModel.id)
            .where(ChatMemberModel.user_id == user_id)
            .order_by(ChatModel.last_message_at.desc().nullslast(), ChatModel.created_at.desc())
            .limit(limit),
        )
        return [chat_to_entity(m) for m in result.scalars().all()]

    async def get_direct_peer(self, chat_id: UUID, user_id: UUID) -> UUID | None:
        m = await self._session.get(DirectChatPairModel, chat_id)
        if m is None:
            return None
        if m.user_low_id == user_id:
            return m.user_high_id
        if m.user_high_id == user_id:
            return m.user_low_id
        return None

    async def get_place_id(self, chat_id: UUID) -> UUID | None:
        m = await self._session.get(PlaceChatModel, chat_id)
        return m.place_id if m else None

    async def find_by_client_message_id(
        self,
        chat_id: UUID,
        author_id: UUID,
        client_message_id: UUID,
    ) -> Message | None:
        result = await self._session.execute(
            select(MessageModel).where(
                MessageModel.chat_id == chat_id,
                MessageModel.author_id == author_id,
                MessageModel.client_message_id == client_message_id,
            ),
        )
        m = result.scalars().one_or_none()
        return message_to_entity(m) if m else None

    async def add_message(self, message: Message) -> Message:
        m = MessageModel(
            id=message.id,
            chat_id=message.chat_id,
            author_id=message.author_id,
            body=message.body,
            client_message_id=message.client_message_id,
            reply_to_id=message.reply_to_id,
        )
        self._session.add(m)
        await self._session.flush()
        return message_to_entity(m)

    async def add_attachment(self, attachment: MessageAttachment) -> MessageAttachment:
        m = MessageAttachmentModel(
            id=attachment.id,
            message_id=attachment.message_id,
            kind=attachment.kind,
            url=attachment.url,
            mime=attachment.mime,
            size_bytes=attachment.size_bytes,
        )
        self._session.add(m)
        await self._session.flush()
        return attachment_to_entity(m)

    async def list_attachments_for_messages(
        self,
        message_ids: list[UUID],
    ) -> dict[UUID, list[MessageAttachment]]:
        if not message_ids:
            return {}
        result = await self._session.execute(
            select(MessageAttachmentModel).where(
                MessageAttachmentModel.message_id.in_(message_ids),
            ),
        )
        out: dict[UUID, list[MessageAttachment]] = {mid: [] for mid in message_ids}
        for m in result.scalars().all():
            out.setdefault(m.message_id, []).append(attachment_to_entity(m))
        return out

    async def map_user_briefs(
        self,
        user_ids: list[UUID],
    ) -> dict[UUID, tuple[str, str | None, str | None]]:
        if not user_ids:
            return {}
        unique = list({uid for uid in user_ids})
        result = await self._session.execute(
            select(
                UserModel.id,
                UserModel.username,
                UserModel.display_name,
                UserModel.avatar_url,
            ).where(UserModel.id.in_(unique)),
        )
        return {
            row.id: (row.username, row.display_name, row.avatar_url)
            for row in result.all()
        }

    async def get_message(self, message_id: UUID) -> Message | None:
        m = await self._session.get(MessageModel, message_id)
        return message_to_entity(m) if m else None

    async def save_message(self, message: Message) -> Message:
        m = await self._session.get(MessageModel, message.id)
        if m is None:
            raise LookupError("message not found")
        m.body = message.body
        m.deleted_at = message.deleted_at
        await self._session.flush()
        return message_to_entity(m)

    async def list_messages(
        self,
        chat_id: UUID,
        *,
        before_id: UUID | None = None,
        limit: int = 50,
    ) -> list[Message]:
        q = select(MessageModel).where(MessageModel.chat_id == chat_id)
        if before_id is not None:
            before = await self._session.get(MessageModel, before_id)
            if before is not None:
                q = q.where(MessageModel.created_at < before.created_at)
        q = q.order_by(MessageModel.created_at.desc()).limit(limit)
        result = await self._session.execute(q)
        return [message_to_entity(m) for m in result.scalars().all()]

    async def mark_read(self, chat_id: UUID, user_id: UUID, message_id: UUID) -> None:
        m = await self._session.get(ChatMemberModel, {"chat_id": chat_id, "user_id": user_id})
        if m is not None:
            m.last_read_message_id = message_id
            await self._session.flush()

    async def touch_last_message(self, chat_id: UUID, when: datetime) -> None:
        m = await self._session.get(ChatModel, chat_id)
        if m is not None:
            m.last_message_at = when
            await self._session.flush()

    async def list_reactions_for_messages(
        self,
        message_ids: list[UUID],
    ) -> dict[UUID, list[tuple[str, UUID, datetime]]]:
        """message_id -> [(emoji, user_id, created_at), ...]"""
        if not message_ids:
            return {}
        result = await self._session.execute(
            select(MessageReactionModel)
            .where(MessageReactionModel.message_id.in_(message_ids))
            .order_by(MessageReactionModel.created_at.asc()),
        )
        out: dict[UUID, list[tuple[str, UUID, datetime]]] = {mid: [] for mid in message_ids}
        for m in result.scalars().all():
            out.setdefault(m.message_id, []).append((m.emoji, m.user_id, m.created_at))
        return out

    async def get_user_reaction(self, message_id: UUID, user_id: UUID) -> str | None:
        m = await self._session.get(
            MessageReactionModel,
            {"message_id": message_id, "user_id": user_id},
        )
        return m.emoji if m else None

    async def upsert_reaction(
        self,
        *,
        message_id: UUID,
        user_id: UUID,
        emoji: str,
        when: datetime,
    ) -> None:
        m = await self._session.get(
            MessageReactionModel,
            {"message_id": message_id, "user_id": user_id},
        )
        if m is None:
            self._session.add(
                MessageReactionModel(
                    message_id=message_id,
                    user_id=user_id,
                    emoji=emoji,
                    created_at=when,
                ),
            )
        else:
            m.emoji = emoji
            m.created_at = when
        await self._session.flush()

    async def delete_reaction(self, message_id: UUID, user_id: UUID) -> None:
        m = await self._session.get(
            MessageReactionModel,
            {"message_id": message_id, "user_id": user_id},
        )
        if m is not None:
            await self._session.delete(m)
            await self._session.flush()
