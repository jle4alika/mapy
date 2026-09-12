"""ORM ↔ chats."""

from __future__ import annotations

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
    PlaceChatModel,
)


def chat_to_entity(m: ChatModel) -> Chat:
    return Chat(
        id=m.id,
        kind=m.kind,  # type: ignore[arg-type]
        created_at=m.created_at,
        last_message_at=m.last_message_at,
    )


def message_to_entity(m: MessageModel) -> Message:
    return Message(
        id=m.id,
        chat_id=m.chat_id,
        author_id=m.author_id,
        body=m.body,
        client_message_id=m.client_message_id,
        reply_to_id=m.reply_to_id,
        deleted_at=m.deleted_at,
        created_at=m.created_at,
    )


def attachment_to_entity(m: MessageAttachmentModel) -> MessageAttachment:
    return MessageAttachment(
        id=m.id,
        message_id=m.message_id,
        kind=m.kind,  # type: ignore[arg-type]
        url=m.url,
        mime=m.mime,
        size_bytes=m.size_bytes,
    )


def pair_to_entity(m: DirectChatPairModel) -> DirectChatPair:
    return DirectChatPair(
        chat_id=m.chat_id,
        user_low_id=m.user_low_id,
        user_high_id=m.user_high_id,
    )


def place_chat_to_entity(m: PlaceChatModel) -> PlaceChat:
    return PlaceChat(chat_id=m.chat_id, place_id=m.place_id)


def member_to_entity(m: ChatMemberModel) -> ChatMember:
    return ChatMember(
        chat_id=m.chat_id,
        user_id=m.user_id,
        role=m.role,  # type: ignore[arg-type]
        joined_at=m.joined_at,
        last_read_message_id=m.last_read_message_id,
    )
