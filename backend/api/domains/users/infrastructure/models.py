"""
ORM-модель пользователя (persistence).

Anti-corruption: fastapi-users / SQLAlchemy живут здесь, не в domain/.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi_users.db import SQLAlchemyBaseUserTable
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.postgres.base import Base, UUIDBase


class UserModel(SQLAlchemyBaseUserTable[uuid.UUID], UUIDBase):
    """Таблица users для SQLAlchemy + fastapi-users."""

    __tablename__ = "users"

    username: Mapped[str] = mapped_column(unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_text: Mapped[str | None] = mapped_column(String(160), nullable=True)
    status_emoji: Mapped[str | None] = mapped_column(String(32), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    scheduled_deletion_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=False),
        nullable=True,
    )


class UserPrivacySettingsModel(Base):
    """Настройки приватности пользователя (1:1)."""

    __tablename__ = "user_privacy_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    share_precise_location: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    share_battery: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    share_speed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    discoverable_in_search: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_in_place_chats_as_nearby: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )


class UserNotificationSettingsModel(Base):
    """Настройки уведомлений пользователя (1:1)."""

    __tablename__ = "user_notification_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    dm_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    friend_requests: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    place_chat_activity: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    friend_arrived: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    system: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class UserDeviceModel(Base):
    """Устройство для push (Expo Push Token)."""

    __tablename__ = "user_devices"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    expo_push_token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    platform: Mapped[str] = mapped_column(String(16), nullable=False, default="unknown")
    device_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=True)
