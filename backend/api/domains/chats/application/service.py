"""Сервис чатов."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from domains.chats.application.dto import (
    ChatDTO,
    MessageAttachmentDTO,
    MessageDTO,
    MessageReactionDTO,
)
from domains.chats.application.ports import AbstractChatsService, AbstractChatsUnitOfWork
from domains.chats.domain.entities import (
    Chat,
    ChatMember,
    DirectChatPair,
    Message,
    MessageAttachment,
    PlaceChat,
)
from domains.chats.domain.errors import ChatNotFoundError, InvalidMessageError, NotChatMemberError, NotFriendsError
from domains.friends.application.ports import AbstractFriendsUnitOfWork
from domains.places.application.ports import AbstractPlacesUnitOfWork
from domains.places.domain.errors import PlaceNotFoundError

_KIND_LABEL = {
    "image": "Фото",
    "video": "Видео",
    "audio": "Аудио",
    "file": "Файл",
}

# Базовый набор реакций Telegram (quick + extended)
ALLOWED_REACTION_EMOJIS = frozenset(
    {
        "👍",
        "👎",
        "❤",
        "❤️",
        "🔥",
        "🥰",
        "👏",
        "😁",
        "🤔",
        "🤯",
        "😱",
        "🤬",
        "😢",
        "🎉",
        "🤩",
        "🤮",
        "💩",
        "🙏",
        "👌",
        "🕊",
        "🕊️",
        "🤡",
        "🥱",
        "🥴",
        "😍",
        "🐳",
        "❤‍🔥",
        "❤️‍🔥",
        "🌚",
        "🌭",
        "💯",
        "🤣",
        "⚡",
        "🍌",
        "🏆",
        "💔",
        "🤨",
        "😐",
        "🍓",
        "🍾",
        "💋",
        "🖕",
        "😈",
        "😴",
        "😭",
        "🤓",
        "👻",
        "👨‍💻",
        "👀",
        "🎃",
        "🙈",
        "😇",
        "😨",
        "🤝",
        "✍",
        "✍️",
        "🤗",
        "🫡",
        "🎅",
        "🎄",
        "☃",
        "☃️",
        "💅",
        "🤪",
        "🗿",
        "🆒",
        "💘",
        "🙉",
        "🦄",
        "😘",
        "💊",
        "🙊",
        "😎",
        "👾",
        "🤷‍♂",
        "🤷‍♂️",
        "🤷",
        "🤷‍♀",
        "🤷‍♀️",
        "😡",
    }
)


def _normalize_reaction_emoji(emoji: str) -> str:
    text = (emoji or "").strip()
    # Telegram часто хранит ❤ без VS16; принимаем оба варианта сердца
    if text == "❤️":
        return "❤"
    if text == "❤️‍🔥":
        return "❤‍🔥"
    if text == "🕊️":
        return "🕊"
    if text == "✍️":
        return "✍"
    if text == "☃️":
        return "☃"
    return text


def _normalize_media_url(url: str) -> str:
    """Путь /media/... — клиент сам подставляет API_BASE_URL."""
    if "/media/" in url:
        return "/media/" + url.split("/media/", 1)[1]
    return url


def _att_dto(a: MessageAttachment) -> MessageAttachmentDTO:
    return MessageAttachmentDTO(
        id=a.id,
        kind=a.kind,
        url=_normalize_media_url(a.url),
        mime=a.mime,
        size_bytes=a.size_bytes,
    )


def _aggregate_reactions(
    rows: list[tuple[str, object, object]],
    viewer_id: object,
) -> list[MessageReactionDTO]:
    """Группировка как в Telegram: emoji + count, me если своя."""
    order: list[str] = []
    counts: dict[str, int] = {}
    mine: set[str] = set()
    for emoji, uid, _created in rows:
        if emoji not in counts:
            order.append(emoji)
            counts[emoji] = 0
        counts[emoji] += 1
        if uid == viewer_id:
            mine.add(emoji)
    # Сортировка: больше реакций выше, при равенстве — порядок появления
    ranked = sorted(order, key=lambda e: (-counts[e], order.index(e)))
    return [
        MessageReactionDTO(emoji=e, count=counts[e], me=e in mine)
        for e in ranked
    ]

def _msg_dto(
    m: Message,
    attachments: list[MessageAttachment] | None = None,
    reactions: list[MessageReactionDTO] | None = None,
    *,
    author_username: str | None = None,
    author_display_name: str | None = None,
    author_avatar_url: str | None = None,
) -> MessageDTO:
    avatar = author_avatar_url
    if avatar:
        avatar = _normalize_media_url(avatar)
    return MessageDTO(
        id=m.id,
        chat_id=m.chat_id,
        author_id=m.author_id,
        author_username=author_username,
        author_display_name=author_display_name,
        author_avatar_url=avatar,
        body=None if m.deleted_at else m.body,
        client_message_id=m.client_message_id,
        reply_to_id=m.reply_to_id,
        deleted_at=m.deleted_at,
        created_at=m.created_at,
        attachments=[] if m.deleted_at else [_att_dto(a) for a in (attachments or [])],
        reactions=[] if m.deleted_at else (reactions or []),
    )


class ChatsService(AbstractChatsService):
    def __init__(
        self,
        uow: AbstractChatsUnitOfWork,
        friends_uow: AbstractFriendsUnitOfWork,
        places_uow: AbstractPlacesUnitOfWork,
    ) -> None:
        self._uow = uow
        self._friends_uow = friends_uow
        self._places_uow = places_uow

    def _now(self) -> datetime:
        return datetime.now(UTC).replace(tzinfo=None)

    async def _author_kwargs(self, *author_ids: UUID) -> dict[UUID, dict[str, str | None]]:
        briefs = await self._uow.chats.map_user_briefs(list(author_ids))
        out: dict[UUID, dict[str, str | None]] = {}
        for uid, (username, display_name, avatar_url) in briefs.items():
            out[uid] = {
                "author_username": username,
                "author_display_name": display_name,
                "author_avatar_url": avatar_url,
            }
        return out

    def _with_author(self, m: Message, authors: dict[UUID, dict[str, str | None]], **kwargs):
        meta = authors.get(m.author_id, {})
        return _msg_dto(m, **kwargs, **meta)

    async def assert_member(self, user_id: UUID, chat_id: UUID) -> None:
        if not await self._uow.chats.is_member(chat_id, user_id):
            raise NotChatMemberError("Нет доступа к чату")

    async def _to_chat_dto(self, chat: Chat, user_id: UUID) -> ChatDTO:
        peer = None
        place_id = None
        title = None
        if chat.kind == "direct":
            peer = await self._uow.chats.get_direct_peer(chat.id, user_id)
        else:
            place_id = await self._uow.chats.get_place_id(chat.id)
            if place_id:
                place = await self._places_uow.places.get(place_id)
                title = place.name if place else None
        return ChatDTO(
            id=chat.id,
            kind=chat.kind,
            last_message_at=chat.last_message_at,
            peer_user_id=peer,
            place_id=place_id,
            title=title,
        )

    async def get_or_create_direct(self, user_id: UUID, peer_id: UUID) -> ChatDTO:
        if user_id == peer_id:
            raise NotFriendsError("Нельзя создать чат с собой")
        if not await self._friends_uow.friends.get_friendship(user_id, peer_id):
            raise NotFriendsError("Личный чат только для друзей")
        if await self._friends_uow.friends.is_blocked(user_id, peer_id):
            raise NotFriendsError("Пользователь заблокирован")
        existing = await self._uow.chats.get_direct_pair(user_id, peer_id)
        if existing is not None:
            chat = await self._uow.chats.get_chat(existing.chat_id)
            if chat is None:
                raise ChatNotFoundError("Чат не найден")
            await self._uow.chats.ensure_member(
                ChatMember(chat_id=chat.id, user_id=user_id),
            )
            await self._uow.commit()
            return await self._to_chat_dto(chat, user_id)
        chat = Chat(id=uuid4(), kind="direct", created_at=self._now())
        await self._uow.chats.add_chat(chat)
        await self._uow.chats.add_direct_pair(DirectChatPair.of(chat.id, user_id, peer_id))
        await self._uow.chats.ensure_member(ChatMember(chat_id=chat.id, user_id=user_id))
        await self._uow.chats.ensure_member(ChatMember(chat_id=chat.id, user_id=peer_id))
        await self._uow.commit()
        return await self._to_chat_dto(chat, user_id)

    async def get_or_create_place_chat(self, user_id: UUID, place_id: UUID) -> ChatDTO:
        place = await self._places_uow.places.get(place_id)
        if place is None:
            raise PlaceNotFoundError("Место не найдено")
        if not place.is_public and place.creator_id != user_id:
            if place.creator_id is None or not await self._friends_uow.friends.get_friendship(
                user_id,
                place.creator_id,
            ):
                raise NotFriendsError("Нет доступа к приватному месту")
        existing = await self._uow.chats.get_place_chat(place_id)
        if existing is not None:
            chat = await self._uow.chats.get_chat(existing.chat_id)
            if chat is None:
                raise ChatNotFoundError("Чат не найден")
            await self._uow.chats.ensure_member(ChatMember(chat_id=chat.id, user_id=user_id))
            await self._uow.commit()
            return await self._to_chat_dto(chat, user_id)
        chat = Chat(id=uuid4(), kind="place", created_at=self._now())
        await self._uow.chats.add_chat(chat)
        await self._uow.chats.add_place_chat(PlaceChat(chat_id=chat.id, place_id=place_id))
        await self._uow.chats.ensure_member(ChatMember(chat_id=chat.id, user_id=user_id))
        await self._uow.commit()
        return await self._to_chat_dto(chat, user_id)

    async def list_chats(self, user_id: UUID) -> list[ChatDTO]:
        chats = await self._uow.chats.list_chats_for_user(user_id)
        return [await self._to_chat_dto(c, user_id) for c in chats]

    async def list_messages(
        self,
        user_id: UUID,
        chat_id: UUID,
        *,
        before_id: UUID | None = None,
        limit: int = 50,
    ) -> list[MessageDTO]:
        if not await self._uow.chats.is_member(chat_id, user_id):
            raise NotChatMemberError("Нет доступа к чату")
        messages = await self._uow.chats.list_messages(chat_id, before_id=before_id, limit=limit)
        ids = [m.id for m in messages]
        atts = await self._uow.chats.list_attachments_for_messages(ids)
        rx = await self._uow.chats.list_reactions_for_messages(ids)
        authors = await self._author_kwargs(*(m.author_id for m in messages))
        return [
            self._with_author(
                m,
                authors,
                attachments=atts.get(m.id, []),
                reactions=_aggregate_reactions(rx.get(m.id, []), user_id),
            )
            for m in messages
        ]

    async def list_member_ids(self, chat_id: UUID) -> list[UUID]:
        return await self._uow.chats.list_member_ids(chat_id)

    async def get_chat_kind(self, chat_id: UUID) -> str | None:
        chat = await self._uow.chats.get_chat(chat_id)
        return chat.kind if chat else None

    async def send_message(
        self,
        user_id: UUID,
        chat_id: UUID,
        *,
        body: str,
        client_message_id: UUID | None = None,
        reply_to_id: UUID | None = None,
        attachments: list[dict] | None = None,
    ) -> MessageDTO:
        if not await self._uow.chats.is_member(chat_id, user_id):
            raise NotChatMemberError("Нет доступа к чату")
        authors = await self._author_kwargs(user_id)
        if client_message_id is not None:
            existing = await self._uow.chats.find_by_client_message_id(
                chat_id,
                user_id,
                client_message_id,
            )
            if existing is not None:
                existing_atts = await self._uow.chats.list_attachments_for_messages([existing.id])
                existing_rx = await self._uow.chats.list_reactions_for_messages([existing.id])
                return self._with_author(
                    existing,
                    authors,
                    attachments=existing_atts.get(existing.id, []),
                    reactions=_aggregate_reactions(existing_rx.get(existing.id, []), user_id),
                )
        att_payloads = attachments or []
        text = (body or "").strip()
        if not text and att_payloads:
            kinds = {str(a.get("kind") or "file") for a in att_payloads}
            if len(kinds) == 1:
                text = _KIND_LABEL.get(next(iter(kinds)), "Файл")
            else:
                text = "Вложение"

        msg = Message.create(
            id=uuid4(),
            chat_id=chat_id,
            author_id=user_id,
            body=text,
            client_message_id=client_message_id,
            reply_to_id=reply_to_id,
            has_attachment=bool(att_payloads),
        )
        saved = await self._uow.chats.add_message(msg)
        saved_atts: list[MessageAttachment] = []
        for item in att_payloads[:4]:
            kind = str(item.get("kind") or "file")
            if kind not in {"image", "video", "audio", "file"}:
                kind = "file"
            url = str(item.get("url") or "").strip()
            if not url:
                continue
            att = MessageAttachment(
                id=uuid4(),
                message_id=saved.id,
                kind=kind,  # type: ignore[arg-type]
                url=url[:1024],
                mime=(str(item["mime"])[:128] if item.get("mime") else None),
                size_bytes=int(item["size_bytes"]) if item.get("size_bytes") is not None else None,
            )
            saved_atts.append(await self._uow.chats.add_attachment(att))
        await self._uow.chats.touch_last_message(chat_id, self._now())
        await self._uow.commit()
        return self._with_author(saved, authors, attachments=saved_atts)

    async def mark_read(self, user_id: UUID, chat_id: UUID, message_id: UUID) -> None:
        if not await self._uow.chats.is_member(chat_id, user_id):
            raise NotChatMemberError("Нет доступа к чату")
        await self._uow.chats.mark_read(chat_id, user_id, message_id)
        await self._uow.commit()

    async def soft_delete_message(self, user_id: UUID, message_id: UUID) -> MessageDTO:
        msg = await self._uow.chats.get_message(message_id)
        if msg is None:
            raise ChatNotFoundError("Сообщение не найдено")
        msg.soft_delete(by_user_id=user_id, when=self._now())
        saved = await self._uow.chats.save_message(msg)
        await self._uow.commit()
        authors = await self._author_kwargs(saved.author_id)
        return self._with_author(saved, authors, attachments=[])

    async def set_reaction(self, user_id: UUID, message_id: UUID, emoji: str) -> MessageDTO:
        msg = await self._uow.chats.get_message(message_id)
        if msg is None or msg.deleted_at is not None:
            raise ChatNotFoundError("Сообщение не найдено")
        if not await self._uow.chats.is_member(msg.chat_id, user_id):
            raise NotChatMemberError("Нет доступа к чату")
        normalized = _normalize_reaction_emoji(emoji)
        if not normalized or normalized not in ALLOWED_REACTION_EMOJIS:
            raise InvalidMessageError("Недопустимая реакция")
        current = await self._uow.chats.get_user_reaction(message_id, user_id)
        if current == normalized:
            await self._uow.chats.delete_reaction(message_id, user_id)
        else:
            await self._uow.chats.upsert_reaction(
                message_id=message_id,
                user_id=user_id,
                emoji=normalized,
                when=self._now(),
            )
        await self._uow.commit()
        atts = await self._uow.chats.list_attachments_for_messages([message_id])
        rx = await self._uow.chats.list_reactions_for_messages([message_id])
        authors = await self._author_kwargs(msg.author_id)
        return self._with_author(
            msg,
            authors,
            attachments=atts.get(message_id, []),
            reactions=_aggregate_reactions(rx.get(message_id, []), user_id),
        )
