"""Порты application-слоя friends."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from types import TracebackType
from typing import Self
from uuid import UUID

from domains.friends.application.dto import (
    FriendDTO,
    FriendRequestDTO,
    InviteInfoDTO,
    VisibilityOverrideDTO,
)
from domains.friends.domain.entities import (
    FriendRequest,
    Friendship,
    FriendVisibilityOverride,
    UserBlock,
    VisibilityMode,
)


class AbstractFriendsRepository(ABC):
    @abstractmethod
    async def get_request(self, request_id: UUID) -> FriendRequest | None: ...

    @abstractmethod
    async def find_pending(self, from_user_id: UUID, to_user_id: UUID) -> FriendRequest | None: ...

    @abstractmethod
    async def add_request(self, request: FriendRequest) -> FriendRequest: ...

    @abstractmethod
    async def save_request(self, request: FriendRequest) -> FriendRequest: ...

    @abstractmethod
    async def list_requests_for(
        self,
        user_id: UUID,
        *,
        incoming: bool = True,
        outgoing: bool = True,
    ) -> list[FriendRequest]: ...

    @abstractmethod
    async def get_friendship(self, user_a: UUID, user_b: UUID) -> Friendship | None: ...

    @abstractmethod
    async def add_friendship(self, friendship: Friendship) -> Friendship: ...

    @abstractmethod
    async def remove_friendship(self, user_a: UUID, user_b: UUID) -> None: ...

    @abstractmethod
    async def list_friend_ids(self, user_id: UUID) -> list[UUID]: ...

    @abstractmethod
    async def list_friendships(self, user_id: UUID) -> list[Friendship]: ...

    @abstractmethod
    async def is_blocked(self, user_a: UUID, user_b: UUID) -> bool: ...

    @abstractmethod
    async def add_block(self, block: UserBlock) -> UserBlock: ...

    @abstractmethod
    async def remove_block(self, blocker_id: UUID, blocked_id: UUID) -> None: ...

    @abstractmethod
    async def get_visibility(
        self,
        owner_id: UUID,
        viewer_id: UUID,
    ) -> FriendVisibilityOverride | None: ...

    @abstractmethod
    async def save_visibility(
        self,
        override: FriendVisibilityOverride,
    ) -> FriendVisibilityOverride: ...

    @abstractmethod
    async def list_visibility(self, owner_id: UUID) -> list[FriendVisibilityOverride]: ...

    @abstractmethod
    async def list_active_visibility_for_viewer(
        self,
        viewer_id: UUID,
        *,
        now: datetime,
    ) -> list[FriendVisibilityOverride]: ...


class AbstractFriendsUnitOfWork(ABC):
    friends: AbstractFriendsRepository

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


class AbstractFriendsService(ABC):
    @abstractmethod
    async def send_request(
        self,
        from_user_id: UUID,
        *,
        to_user_id: UUID | None = None,
        to_username: str | None = None,
        message: str | None = None,
    ) -> FriendRequestDTO: ...

    @abstractmethod
    async def accept(self, user_id: UUID, request_id: UUID) -> FriendRequestDTO: ...

    @abstractmethod
    async def reject(self, user_id: UUID, request_id: UUID) -> FriendRequestDTO: ...

    @abstractmethod
    async def cancel(self, user_id: UUID, request_id: UUID) -> FriendRequestDTO: ...

    @abstractmethod
    async def list_friends(self, user_id: UUID) -> list[FriendDTO]: ...

    @abstractmethod
    async def list_requests(self, user_id: UUID) -> list[FriendRequestDTO]: ...

    @abstractmethod
    async def remove_friend(self, user_id: UUID, friend_id: UUID) -> None: ...

    @abstractmethod
    async def block(self, blocker_id: UUID, blocked_id: UUID) -> None: ...

    @abstractmethod
    async def unblock(self, blocker_id: UUID, blocked_id: UUID) -> None: ...

    @abstractmethod
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
    ) -> VisibilityOverrideDTO: ...

    @abstractmethod
    async def list_visibility(self, owner_id: UUID) -> list[VisibilityOverrideDTO]: ...

    @abstractmethod
    async def claim_invite(self, claimant_id: UUID, *, inviter_username: str) -> FriendDTO: ...

    @abstractmethod
    async def search_users(
        self,
        user_id: UUID,
        *,
        query: str,
        limit: int = 12,
    ) -> list[FriendDTO]: ...

    @abstractmethod
    async def invite_info(self, user_id: UUID) -> InviteInfoDTO: ...
