"""
Выходные DTO use-case'ов профиля.

Держим только реальные контракты ответов (не иерархию «на вырост»).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from common.schemas.base import BaseDTO


class UserPublicDTO(BaseDTO):
    """Публичный профиль (GET /profile/{id})."""

    id: uuid.UUID
    username: str
    display_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    status_text: str | None = None
    status_emoji: str | None = None
    last_seen_at: datetime | None = None
    created_at: datetime | None = None


class UserMeDTO(BaseDTO):
    """Свой профиль (GET /profile/me)."""

    id: uuid.UUID
    username: str
    email: str
    is_active: bool
    is_verified: bool
    is_superuser: bool
    display_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    status_text: str | None = None
    status_emoji: str | None = None
    last_seen_at: datetime | None = None
    scheduled_deletion_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class UserPrivacySettingsDTO(BaseDTO):
    """Настройки приватности."""

    share_precise_location: bool
    share_battery: bool
    share_speed: bool
    discoverable_in_search: bool
    show_in_place_chats_as_nearby: bool


class UserNotificationSettingsDTO(BaseDTO):
    """Настройки уведомлений."""

    dm_enabled: bool
    friend_requests: bool
    place_chat_activity: bool
    friend_arrived: bool
    system: bool
