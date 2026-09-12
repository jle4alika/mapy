"""Application-сервис друзей."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from domains.friends.application.dto import (
    FriendDTO,
    FriendRequestDTO,
    InviteInfoDTO,
    VisibilityOverrideDTO,
)
from domains.friends.application.mappers import FriendsMapper
from domains.friends.application.ports import AbstractFriendsService, AbstractFriendsUnitOfWork
from domains.friends.domain.entities import (
    FriendRequest,
    Friendship,
    FriendVisibilityOverride,
    UserBlock,
    VisibilityMode,
)
from domains.friends.domain.errors import (
    AlreadyFriendsError,
    CannotFriendSelfError,
    FriendshipNotFoundError,
    NotFoundError,
    RequestAlreadyPendingError,
    RequestNotFoundError,
    UserBlockedError,
)
from domains.users.application.ports import AbstractUserUnitOfWork


class FriendsService(AbstractFriendsService):
    def __init__(
        self,
        uow: AbstractFriendsUnitOfWork,
        users_uow: AbstractUserUnitOfWork,
    ) -> None:
        self._uow = uow
        self._users_uow = users_uow

    def _now(self) -> datetime:
        return datetime.now(UTC).replace(tzinfo=None)

    async def send_request(
        self,
        from_user_id: UUID,
        *,
        to_user_id: UUID | None = None,
        to_username: str | None = None,
        message: str | None = None,
    ) -> FriendRequestDTO:
        if to_user_id is None and not to_username:
            raise NotFoundError("Нужен to_user_id или to_username")
        if to_user_id is None:
            target = await self._users_uow.users.get_by_username(to_username or "")
            if target is None or not target.is_active:
                raise NotFoundError("Пользователь не найден")
            to_user_id = target.id
        if from_user_id == to_user_id:
            raise CannotFriendSelfError("Нельзя отправить заявку себе")
        if await self._uow.friends.is_blocked(from_user_id, to_user_id):
            raise UserBlockedError("Пользователь заблокирован")
        if await self._uow.friends.get_friendship(from_user_id, to_user_id):
            raise AlreadyFriendsError("Уже друзья")
        if await self._uow.friends.find_pending(from_user_id, to_user_id):
            raise RequestAlreadyPendingError("Заявка уже отправлена")
        # Встречная pending — принимаем автоматически
        reverse = await self._uow.friends.find_pending(to_user_id, from_user_id)
        if reverse is not None:
            reverse.accept()
            await self._uow.friends.save_request(reverse)
            friendship = Friendship.between(
                id=uuid4(),
                user_a=from_user_id,
                user_b=to_user_id,
                since=self._now(),
            )
            await self._uow.friends.add_friendship(friendship)
            await self._uow.commit()
            return FriendsMapper.to_request(reverse)
        request = FriendRequest.create(
            id=uuid4(),
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            message=message,
        )
        saved = await self._uow.friends.add_request(request)
        await self._uow.commit()
        return FriendsMapper.to_request(saved)

    async def accept(self, user_id: UUID, request_id: UUID) -> FriendRequestDTO:
        request = await self._uow.friends.get_request(request_id)
        if request is None or request.to_user_id != user_id:
            raise RequestNotFoundError("Заявка не найдена")
        request.accept()
        await self._uow.friends.save_request(request)
        if not await self._uow.friends.get_friendship(request.from_user_id, request.to_user_id):
            friendship = Friendship.between(
                id=uuid4(),
                user_a=request.from_user_id,
                user_b=request.to_user_id,
                since=self._now(),
            )
            await self._uow.friends.add_friendship(friendship)
        await self._uow.commit()
        return FriendsMapper.to_request(request)

    async def reject(self, user_id: UUID, request_id: UUID) -> FriendRequestDTO:
        request = await self._uow.friends.get_request(request_id)
        if request is None or request.to_user_id != user_id:
            raise RequestNotFoundError("Заявка не найдена")
        request.reject()
        saved = await self._uow.friends.save_request(request)
        await self._uow.commit()
        return FriendsMapper.to_request(saved)

    async def cancel(self, user_id: UUID, request_id: UUID) -> FriendRequestDTO:
        request = await self._uow.friends.get_request(request_id)
        if request is None or request.from_user_id != user_id:
            raise RequestNotFoundError("Заявка не найдена")
        request.cancel()
        saved = await self._uow.friends.save_request(request)
        await self._uow.commit()
        return FriendsMapper.to_request(saved)

    async def list_friends(self, user_id: UUID) -> list[FriendDTO]:
        friendships = await self._uow.friends.list_friendships(user_id)
        result: list[FriendDTO] = []
        for fr in friendships:
            other_id = fr.other(user_id)
            user = await self._users_uow.users.get_by_id(other_id)
            result.append(
                FriendDTO(
                    user_id=other_id,
                    username=user.username if user else None,
                    display_name=user.display_name if user else None,
                    avatar_url=user.avatar_url if user else None,
                    since=fr.since,
                ),
            )
        return result

    async def list_requests(self, user_id: UUID) -> list[FriendRequestDTO]:
        items = await self._uow.friends.list_requests_for(user_id)
        return [FriendsMapper.to_request(i) for i in items]

    async def remove_friend(self, user_id: UUID, friend_id: UUID) -> None:
        friendship = await self._uow.friends.get_friendship(user_id, friend_id)
        if friendship is None:
            raise FriendshipNotFoundError("Дружба не найдена")
        await self._uow.friends.remove_friendship(user_id, friend_id)
        await self._uow.commit()

    async def block(self, blocker_id: UUID, blocked_id: UUID) -> None:
        if blocker_id == blocked_id:
            raise CannotFriendSelfError("Нельзя заблокировать себя")
        await self._uow.friends.remove_friendship(blocker_id, blocked_id)
        block = UserBlock.create(id=uuid4(), blocker_id=blocker_id, blocked_id=blocked_id)
        await self._uow.friends.add_block(block)
        await self._uow.commit()

    async def unblock(self, blocker_id: UUID, blocked_id: UUID) -> None:
        await self._uow.friends.remove_block(blocker_id, blocked_id)
        await self._uow.commit()

    async def set_visibility(
        self,
        owner_id: UUID,
        viewer_id: UUID,
        *,
        mode: VisibilityMode,
        expires_at: datetime | None = None,
        frozen_lat: float | None = None,
        frozen_lon: float | None = None,
        approximate_radius_m: int | None = None,
    ) -> VisibilityOverrideDTO:
        if not await self._uow.friends.get_friendship(owner_id, viewer_id):
            raise FriendshipNotFoundError("Дружба не найдена")
        now = self._now()
        existing = await self._uow.friends.get_visibility(owner_id, viewer_id)
        if existing is None:
            existing = FriendVisibilityOverride(
                id=uuid4(),
                owner_id=owner_id,
                viewer_id=viewer_id,
                mode="normal",
            )
        existing.apply(
            mode=mode,
            expires_at=expires_at,
            now=now,
            frozen_lat=frozen_lat,
            frozen_lon=frozen_lon,
            approximate_radius_m=approximate_radius_m,
        )
        saved = await self._uow.friends.save_visibility(existing)
        await self._uow.commit()
        return FriendsMapper.to_visibility(saved)

    async def list_visibility(self, owner_id: UUID) -> list[VisibilityOverrideDTO]:
        items = await self._uow.friends.list_visibility(owner_id)
        return [FriendsMapper.to_visibility(i) for i in items]

    async def claim_invite(self, claimant_id: UUID, *, inviter_username: str) -> FriendDTO:
        """По ссылке приглашения сразу становимся друзьями (без заявки)."""
        username = (inviter_username or "").strip().lstrip("@")
        if not username:
            raise NotFoundError("Нужен username пригласившего")
        inviter = await self._users_uow.users.get_by_username(username)
        if inviter is None or not inviter.is_active:
            raise NotFoundError("Пользователь не найден")
        if inviter.id == claimant_id:
            raise CannotFriendSelfError("Нельзя добавить себя")
        if await self._uow.friends.is_blocked(claimant_id, inviter.id):
            raise UserBlockedError("Пользователь заблокирован")

        existing = await self._uow.friends.get_friendship(claimant_id, inviter.id)
        if existing is None:
            # Закрываем встречные pending, если были
            pending_a = await self._uow.friends.find_pending(claimant_id, inviter.id)
            pending_b = await self._uow.friends.find_pending(inviter.id, claimant_id)
            for pending in (pending_a, pending_b):
                if pending is not None and pending.status == "pending":
                    pending.accept()
                    await self._uow.friends.save_request(pending)
            friendship = Friendship.between(
                id=uuid4(),
                user_a=claimant_id,
                user_b=inviter.id,
                since=self._now(),
            )
            await self._uow.friends.add_friendship(friendship)
            await self._uow.commit()

        return FriendDTO(
            user_id=inviter.id,
            username=inviter.username,
            display_name=inviter.display_name,
            avatar_url=inviter.avatar_url,
            since=self._now(),
        )

    async def search_users(
        self,
        user_id: UUID,
        *,
        query: str,
        limit: int = 12,
    ) -> list[FriendDTO]:
        users = await self._users_uow.users.search_by_username(
            query,
            exclude_id=user_id,
            limit=limit,
        )
        return [
            FriendDTO(
                user_id=u.id,
                username=u.username,
                display_name=u.display_name,
                avatar_url=u.avatar_url,
                since=None,
            )
            for u in users
        ]

    async def invite_info(self, user_id: UUID) -> InviteInfoDTO:
        user = await self._users_uow.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("Пользователь не найден")
        username = user.username
        deep = f"mapy://invite/{username}"
        web = f"https://mapy.app/invite/{username}"
        text = (
            f"Добавляйся ко мне в Mapy!\n"
            f"@{username}\n"
            f"{web}\n"
            f"Или открой в приложении: {deep}"
        )
        return InviteInfoDTO(
            username=username,
            deep_link=deep,
            web_link=web,
            share_text=text,
        )
