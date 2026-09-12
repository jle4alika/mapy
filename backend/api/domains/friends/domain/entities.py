"""Доменные сущности друзей и видимости."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import ClassVar, Literal
from uuid import UUID

from domains.friends.domain.errors import (
    CannotFriendSelfError,
    InvalidVisibilityError,
)

FriendRequestStatus = Literal["pending", "accepted", "rejected", "cancelled"]
VisibilityMode = Literal["normal", "frozen", "approximate"]


def ordered_pair(a: UUID, b: UUID) -> tuple[UUID, UUID]:
    """Упорядоченная пара UUID для уникальности дружбы."""
    return (a, b) if a.hex < b.hex else (b, a)


@dataclass(slots=True, kw_only=True)
class FriendRequest:
    id: UUID
    from_user_id: UUID
    to_user_id: UUID
    status: FriendRequestStatus
    message: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def create(
        cls,
        *,
        id: UUID,
        from_user_id: UUID,
        to_user_id: UUID,
        message: str | None = None,
    ) -> FriendRequest:
        if from_user_id == to_user_id:
            raise CannotFriendSelfError("Нельзя отправить заявку себе")
        return cls(
            id=id,
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            status="pending",
            message=(message or "").strip() or None,
        )

    def accept(self) -> None:
        if self.status != "pending":
            raise InvalidVisibilityError("Заявка уже обработана")
        self.status = "accepted"

    def reject(self) -> None:
        if self.status != "pending":
            raise InvalidVisibilityError("Заявка уже обработана")
        self.status = "rejected"

    def cancel(self) -> None:
        if self.status != "pending":
            raise InvalidVisibilityError("Заявка уже обработана")
        self.status = "cancelled"


@dataclass(slots=True, kw_only=True)
class Friendship:
    id: UUID
    user_low_id: UUID
    user_high_id: UUID
    since: datetime

    @classmethod
    def between(cls, *, id: UUID, user_a: UUID, user_b: UUID, since: datetime) -> Friendship:
        if user_a == user_b:
            raise CannotFriendSelfError("Нельзя дружить с собой")
        low, high = ordered_pair(user_a, user_b)
        return cls(id=id, user_low_id=low, user_high_id=high, since=since)

    def involves(self, user_id: UUID) -> bool:
        return user_id in (self.user_low_id, self.user_high_id)

    def other(self, user_id: UUID) -> UUID:
        if user_id == self.user_low_id:
            return self.user_high_id
        if user_id == self.user_high_id:
            return self.user_low_id
        raise ValueError("user_id не в паре дружбы")


@dataclass(slots=True, kw_only=True)
class UserBlock:
    id: UUID
    blocker_id: UUID
    blocked_id: UUID
    created_at: datetime | None = None

    @classmethod
    def create(cls, *, id: UUID, blocker_id: UUID, blocked_id: UUID) -> UserBlock:
        if blocker_id == blocked_id:
            raise CannotFriendSelfError("Нельзя заблокировать себя")
        return cls(id=id, blocker_id=blocker_id, blocked_id=blocked_id)


@dataclass(slots=True, kw_only=True)
class FriendVisibilityOverride:
    """Переопределение видимости гео для конкретного друга."""

    MAX_DURATION: ClassVar[timedelta] = timedelta(hours=24)
    DEFAULT_APPROX_RADIUS_M: ClassVar[int] = 500

    id: UUID
    owner_id: UUID
    viewer_id: UUID
    mode: VisibilityMode
    frozen_lat: float | None = None
    frozen_lon: float | None = None
    frozen_at: datetime | None = None
    approximate_radius_m: int = 500
    expires_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    def apply(
        self,
        *,
        mode: VisibilityMode,
        expires_at: datetime | None,
        now: datetime,
        frozen_lat: float | None = None,
        frozen_lon: float | None = None,
        approximate_radius_m: int | None = None,
    ) -> None:
        if self.owner_id == self.viewer_id:
            raise InvalidVisibilityError("Нельзя задать видимость для себя")
        if mode == "frozen":
            if frozen_lat is None or frozen_lon is None:
                raise InvalidVisibilityError("Для заморозки нужны координаты")
            self.frozen_lat = frozen_lat
            self.frozen_lon = frozen_lon
            self.frozen_at = now
        if mode == "approximate":
            radius = approximate_radius_m or self.DEFAULT_APPROX_RADIUS_M
            if radius < 50 or radius > 5000:
                raise InvalidVisibilityError("Радиус приближения: 50–5000 м")
            self.approximate_radius_m = radius
        if mode != "normal":
            if expires_at is None:
                raise InvalidVisibilityError("Нужен срок действия")
            if expires_at <= now:
                raise InvalidVisibilityError("Срок уже истёк")
            if expires_at - now > self.MAX_DURATION:
                raise InvalidVisibilityError("Максимум 24 часа")
            self.expires_at = expires_at
        else:
            self.expires_at = None
            self.frozen_lat = None
            self.frozen_lon = None
            self.frozen_at = None
        self.mode = mode

    def is_active(self, now: datetime) -> bool:
        if self.mode == "normal":
            return False
        if self.expires_at is None:
            return False
        return self.expires_at > now
