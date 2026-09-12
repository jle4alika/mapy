"""Репозиторий friends."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from domains.friends.application.ports import AbstractFriendsRepository
from domains.friends.domain.entities import (
    FriendRequest,
    Friendship,
    FriendVisibilityOverride,
    UserBlock,
    ordered_pair,
)
from domains.friends.infrastructure.models import (
    FriendRequestModel,
    FriendshipModel,
    FriendVisibilityOverrideModel,
    UserBlockModel,
)
from domains.friends.infrastructure.orm_mapper import (
    block_to_entity,
    friendship_to_entity,
    request_to_entity,
    visibility_to_entity,
)


class FriendsRepository(AbstractFriendsRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_request(self, request_id: UUID) -> FriendRequest | None:
        m = await self._session.get(FriendRequestModel, request_id)
        return request_to_entity(m) if m else None

    async def find_pending(self, from_user_id: UUID, to_user_id: UUID) -> FriendRequest | None:
        result = await self._session.execute(
            select(FriendRequestModel).where(
                FriendRequestModel.from_user_id == from_user_id,
                FriendRequestModel.to_user_id == to_user_id,
                FriendRequestModel.status == "pending",
            ),
        )
        m = result.scalars().one_or_none()
        return request_to_entity(m) if m else None

    async def add_request(self, request: FriendRequest) -> FriendRequest:
        m = FriendRequestModel(
            id=request.id,
            from_user_id=request.from_user_id,
            to_user_id=request.to_user_id,
            status=request.status,
            message=request.message,
        )
        self._session.add(m)
        await self._session.flush()
        return request_to_entity(m)

    async def save_request(self, request: FriendRequest) -> FriendRequest:
        m = await self._session.get(FriendRequestModel, request.id)
        if m is None:
            raise LookupError("request not found")
        m.status = request.status
        m.message = request.message
        await self._session.flush()
        return request_to_entity(m)

    async def list_requests_for(
        self,
        user_id: UUID,
        *,
        incoming: bool = True,
        outgoing: bool = True,
    ) -> list[FriendRequest]:
        clauses = []
        if incoming:
            clauses.append(
                and_(
                    FriendRequestModel.to_user_id == user_id,
                    FriendRequestModel.status == "pending",
                ),
            )
        if outgoing:
            clauses.append(
                and_(
                    FriendRequestModel.from_user_id == user_id,
                    FriendRequestModel.status == "pending",
                ),
            )
        if not clauses:
            return []
        result = await self._session.execute(
            select(FriendRequestModel)
            .where(or_(*clauses))
            .order_by(FriendRequestModel.created_at.desc()),
        )
        return [request_to_entity(m) for m in result.scalars().all()]

    async def get_friendship(self, user_a: UUID, user_b: UUID) -> Friendship | None:
        low, high = ordered_pair(user_a, user_b)
        result = await self._session.execute(
            select(FriendshipModel).where(
                FriendshipModel.user_low_id == low,
                FriendshipModel.user_high_id == high,
            ),
        )
        m = result.scalars().one_or_none()
        return friendship_to_entity(m) if m else None

    async def add_friendship(self, friendship: Friendship) -> Friendship:
        m = FriendshipModel(
            id=friendship.id,
            user_low_id=friendship.user_low_id,
            user_high_id=friendship.user_high_id,
            since=friendship.since,
        )
        self._session.add(m)
        await self._session.flush()
        return friendship_to_entity(m)

    async def remove_friendship(self, user_a: UUID, user_b: UUID) -> None:
        low, high = ordered_pair(user_a, user_b)
        await self._session.execute(
            delete(FriendshipModel).where(
                FriendshipModel.user_low_id == low,
                FriendshipModel.user_high_id == high,
            ),
        )

    async def list_friend_ids(self, user_id: UUID) -> list[UUID]:
        friendships = await self.list_friendships(user_id)
        return [f.other(user_id) for f in friendships]

    async def list_friendships(self, user_id: UUID) -> list[Friendship]:
        result = await self._session.execute(
            select(FriendshipModel).where(
                or_(
                    FriendshipModel.user_low_id == user_id,
                    FriendshipModel.user_high_id == user_id,
                ),
            ),
        )
        return [friendship_to_entity(m) for m in result.scalars().all()]

    async def is_blocked(self, user_a: UUID, user_b: UUID) -> bool:
        result = await self._session.execute(
            select(UserBlockModel.id).where(
                or_(
                    and_(UserBlockModel.blocker_id == user_a, UserBlockModel.blocked_id == user_b),
                    and_(UserBlockModel.blocker_id == user_b, UserBlockModel.blocked_id == user_a),
                ),
            ),
        )
        return result.scalar_one_or_none() is not None

    async def add_block(self, block: UserBlock) -> UserBlock:
        existing = await self._session.execute(
            select(UserBlockModel).where(
                UserBlockModel.blocker_id == block.blocker_id,
                UserBlockModel.blocked_id == block.blocked_id,
            ),
        )
        if existing.scalars().one_or_none() is not None:
            return block
        m = UserBlockModel(
            id=block.id,
            blocker_id=block.blocker_id,
            blocked_id=block.blocked_id,
        )
        self._session.add(m)
        await self._session.flush()
        return block_to_entity(m)

    async def remove_block(self, blocker_id: UUID, blocked_id: UUID) -> None:
        await self._session.execute(
            delete(UserBlockModel).where(
                UserBlockModel.blocker_id == blocker_id,
                UserBlockModel.blocked_id == blocked_id,
            ),
        )

    async def get_visibility(
        self,
        owner_id: UUID,
        viewer_id: UUID,
    ) -> FriendVisibilityOverride | None:
        result = await self._session.execute(
            select(FriendVisibilityOverrideModel).where(
                FriendVisibilityOverrideModel.owner_id == owner_id,
                FriendVisibilityOverrideModel.viewer_id == viewer_id,
            ),
        )
        m = result.scalars().one_or_none()
        return visibility_to_entity(m) if m else None

    async def save_visibility(
        self,
        override: FriendVisibilityOverride,
    ) -> FriendVisibilityOverride:
        result = await self._session.execute(
            select(FriendVisibilityOverrideModel).where(
                FriendVisibilityOverrideModel.owner_id == override.owner_id,
                FriendVisibilityOverrideModel.viewer_id == override.viewer_id,
            ),
        )
        m = result.scalars().one_or_none()
        if m is None:
            m = FriendVisibilityOverrideModel(
                id=override.id,
                owner_id=override.owner_id,
                viewer_id=override.viewer_id,
            )
            self._session.add(m)
        m.mode = override.mode
        m.frozen_lat = override.frozen_lat
        m.frozen_lon = override.frozen_lon
        m.frozen_at = override.frozen_at
        m.approximate_radius_m = override.approximate_radius_m
        m.expires_at = override.expires_at
        await self._session.flush()
        return visibility_to_entity(m)

    async def list_visibility(self, owner_id: UUID) -> list[FriendVisibilityOverride]:
        result = await self._session.execute(
            select(FriendVisibilityOverrideModel).where(
                FriendVisibilityOverrideModel.owner_id == owner_id,
            ),
        )
        return [visibility_to_entity(m) for m in result.scalars().all()]

    async def list_active_visibility_for_viewer(
        self,
        viewer_id: UUID,
        *,
        now: datetime,
    ) -> list[FriendVisibilityOverride]:
        result = await self._session.execute(
            select(FriendVisibilityOverrideModel).where(
                FriendVisibilityOverrideModel.viewer_id == viewer_id,
                FriendVisibilityOverrideModel.mode != "normal",
                FriendVisibilityOverrideModel.expires_at.is_not(None),
                FriendVisibilityOverrideModel.expires_at > now,
            ),
        )
        return [visibility_to_entity(m) for m in result.scalars().all()]
