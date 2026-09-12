"""Порты location."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from types import TracebackType
from typing import Any, Self
from uuid import UUID

from domains.location.application.dto import ActivityItemDTO, FriendLocationDTO, LocationDTO
from domains.location.domain.entities import UserLocation


class AbstractLocationRepository(ABC):
    @abstractmethod
    async def get(self, user_id: UUID) -> UserLocation | None: ...

    @abstractmethod
    async def upsert(self, location: UserLocation) -> UserLocation: ...

    @abstractmethod
    async def get_many(self, user_ids: list[UUID]) -> list[UserLocation]: ...

    @abstractmethod
    async def append_history(self, location: UserLocation) -> None: ...


class AbstractPresencePublisher(ABC):
    """Публикация обновлений присутствия (Redis pub/sub реализует infra)."""

    @abstractmethod
    async def publish_friend_location(
        self,
        *,
        friend_ids: list[UUID],
        payload: dict[str, Any],
    ) -> None: ...


class AbstractLocationUnitOfWork(ABC):
    locations: AbstractLocationRepository

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


class AbstractLocationService(ABC):
    @abstractmethod
    async def upsert_location(
        self,
        user_id: UUID,
        *,
        lat: float,
        lon: float,
        accuracy_m: float | None = None,
        speed_mps: float | None = None,
        heading_deg: float | None = None,
        battery_percent: int | None = None,
        is_moving: bool = False,
        recorded_at: datetime | None = None,
    ) -> LocationDTO: ...

    @abstractmethod
    async def get_friends_snapshot(self, viewer_id: UUID) -> list[FriendLocationDTO]: ...

    @abstractmethod
    async def get_activity_feed(self, viewer_id: UUID, *, limit: int = 50) -> list[ActivityItemDTO]: ...
