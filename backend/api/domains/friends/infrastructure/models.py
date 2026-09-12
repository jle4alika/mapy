"""ORM-модели друзей."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, String, Text, Uuid, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.postgres.base import UUIDBase
from infrastructure.postgres.mixins import UTC_NOW


class FriendRequestModel(UUIDBase):
    __tablename__ = "friend_requests"
    __table_args__ = (
        CheckConstraint("from_user_id <> to_user_id", name="ck_friend_requests_not_self"),
    )

    from_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    to_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", index=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)


class FriendshipModel(UUIDBase):
    __tablename__ = "friendships"
    __table_args__ = (
        UniqueConstraint("user_low_id", "user_high_id", name="uq_friendships_pair"),
        CheckConstraint("user_low_id <> user_high_id", name="ck_friendships_not_self"),
    )

    user_low_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_high_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    since: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=UTC_NOW)


class UserBlockModel(UUIDBase):
    __tablename__ = "user_blocks"
    __table_args__ = (
        UniqueConstraint("blocker_id", "blocked_id", name="uq_user_blocks_pair"),
        CheckConstraint("blocker_id <> blocked_id", name="ck_user_blocks_not_self"),
    )

    blocker_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    blocked_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )


class FriendVisibilityOverrideModel(UUIDBase):
    __tablename__ = "friend_visibility_overrides"
    __table_args__ = (
        UniqueConstraint("owner_id", "viewer_id", name="uq_visibility_owner_viewer"),
        CheckConstraint("owner_id <> viewer_id", name="ck_visibility_not_self"),
    )

    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    viewer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mode: Mapped[str] = mapped_column(String(32), nullable=False, default="normal")
    frozen_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    frozen_lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    frozen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    approximate_radius_m: Mapped[int] = mapped_column(Integer, nullable=False, default=500)
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=False),
        nullable=True,
        index=True,
    )
