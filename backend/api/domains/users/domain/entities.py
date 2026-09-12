"""
Доменная сущность User — поведение и инварианты здесь.

Persistence (SQLAlchemy) и HTTP сюда не проникают: масштабирование =
добавление методов/правил в этот класс (или выделение VO позже).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from typing import ClassVar
from uuid import UUID

from domains.users.domain.errors import (
    InvalidPasswordError,
    InvalidUsernameError,
    UserInactiveError,
)

_USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]+$")


@dataclass(slots=True, kw_only=True)
class UserPrivacySettings:
    """Настройки приватности (значение, привязанное к пользователю)."""

    user_id: UUID
    share_precise_location: bool = True
    share_battery: bool = True
    share_speed: bool = True
    discoverable_in_search: bool = True
    show_in_place_chats_as_nearby: bool = True

    def update(
        self,
        *,
        share_precise_location: bool | None = None,
        share_battery: bool | None = None,
        share_speed: bool | None = None,
        discoverable_in_search: bool | None = None,
        show_in_place_chats_as_nearby: bool | None = None,
    ) -> None:
        if share_precise_location is not None:
            self.share_precise_location = share_precise_location
        if share_battery is not None:
            self.share_battery = share_battery
        if share_speed is not None:
            self.share_speed = share_speed
        if discoverable_in_search is not None:
            self.discoverable_in_search = discoverable_in_search
        if show_in_place_chats_as_nearby is not None:
            self.show_in_place_chats_as_nearby = show_in_place_chats_as_nearby


@dataclass(slots=True, kw_only=True)
class UserNotificationSettings:
    """Настройки уведомлений."""

    user_id: UUID
    dm_enabled: bool = True
    friend_requests: bool = True
    place_chat_activity: bool = True
    friend_arrived: bool = True
    system: bool = True

    def update(
        self,
        *,
        dm_enabled: bool | None = None,
        friend_requests: bool | None = None,
        place_chat_activity: bool | None = None,
        friend_arrived: bool | None = None,
        system: bool | None = None,
    ) -> None:
        if dm_enabled is not None:
            self.dm_enabled = dm_enabled
        if friend_requests is not None:
            self.friend_requests = friend_requests
        if place_chat_activity is not None:
            self.place_chat_activity = place_chat_activity
        if friend_arrived is not None:
            self.friend_arrived = friend_arrived
        if system is not None:
            self.system = system


@dataclass(slots=True, kw_only=True)
class User:
    """Агрегат пользователя: состояние + доменные операции."""

    MIN_PASSWORD_LENGTH: ClassVar[int] = 8
    MIN_USERNAME_LENGTH: ClassVar[int] = 3
    MAX_USERNAME_LENGTH: ClassVar[int] = 32
    MAX_DISPLAY_NAME: ClassVar[int] = 120
    MAX_BIO: ClassVar[int] = 500
    MAX_STATUS_TEXT: ClassVar[int] = 160

    id: UUID
    email: str
    username: str
    hashed_password: str
    is_active: bool = True
    is_superuser: bool = False
    is_verified: bool = False
    display_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    status_text: str | None = None
    status_emoji: str | None = None
    last_seen_at: datetime | None = None
    scheduled_deletion_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    # --- инварианты (можно вызвать до создания сущности) ---

    @classmethod
    def validate_password(cls, password: str) -> None:
        if len(password) < cls.MIN_PASSWORD_LENGTH:
            raise InvalidPasswordError(
                f"Пароль должен быть не короче {cls.MIN_PASSWORD_LENGTH} символов",
            )

    @classmethod
    def validate_username(cls, username: str) -> None:
        if not cls.MIN_USERNAME_LENGTH <= len(username) <= cls.MAX_USERNAME_LENGTH:
            raise InvalidUsernameError(
                f"username: длина {cls.MIN_USERNAME_LENGTH}–{cls.MAX_USERNAME_LENGTH}",
            )
        if not _USERNAME_RE.fullmatch(username):
            raise InvalidUsernameError("username: только латиница, цифры и '_'")

    # --- команды ---

    def activate(self) -> None:
        self.is_active = True
        self.scheduled_deletion_at = None

    def deactivate(self) -> None:
        self.is_active = False
        self.is_superuser = False

    def mark_verified(self) -> None:
        self._ensure_active()
        self.is_verified = True

    def rename(self, username: str) -> None:
        self._ensure_active()
        self.validate_username(username)
        self.username = username

    def replace_password_hash(self, hashed_password: str) -> None:
        """Хеш считается в infra; домен только принимает готовый."""
        self._ensure_active()
        if not hashed_password:
            raise InvalidPasswordError("hashed_password пуст")
        self.hashed_password = hashed_password

    def grant_superuser(self) -> None:
        self._ensure_active()
        self.is_superuser = True

    def revoke_superuser(self) -> None:
        self.is_superuser = False

    def update_profile(
        self,
        *,
        display_name: str | None = None,
        avatar_url: str | None = None,
        bio: str | None = None,
        clear_display_name: bool = False,
        clear_avatar_url: bool = False,
        clear_bio: bool = False,
    ) -> None:
        """Обновить поля профиля (None без clear_* = без изменений)."""
        self._ensure_active()
        if clear_display_name:
            self.display_name = None
        elif display_name is not None:
            name = display_name.strip()
            if len(name) > self.MAX_DISPLAY_NAME:
                raise InvalidUsernameError(
                    f"display_name: максимум {self.MAX_DISPLAY_NAME} символов",
                )
            self.display_name = name or None
        if clear_avatar_url:
            self.avatar_url = None
        elif avatar_url is not None:
            self.avatar_url = avatar_url.strip() or None
        if clear_bio:
            self.bio = None
        elif bio is not None:
            text = bio.strip()
            if len(text) > self.MAX_BIO:
                raise InvalidUsernameError(f"bio: максимум {self.MAX_BIO} символов")
            self.bio = text or None

    def update_status(
        self,
        *,
        status_text: str | None = None,
        status_emoji: str | None = None,
        clear_status: bool = False,
    ) -> None:
        """Обновить статус или сбросить."""
        self._ensure_active()
        if clear_status:
            self.status_text = None
            self.status_emoji = None
            return
        if status_text is not None:
            text = status_text.strip()
            if len(text) > self.MAX_STATUS_TEXT:
                raise InvalidUsernameError(
                    f"status_text: максимум {self.MAX_STATUS_TEXT} символов",
                )
            self.status_text = text or None
        if status_emoji is not None:
            self.status_emoji = status_emoji.strip() or None

    def touch_last_seen(self, when: datetime) -> None:
        self.last_seen_at = when

    def schedule_deletion(self, when: datetime) -> None:
        self.scheduled_deletion_at = when
        self.is_active = False

    def _ensure_active(self) -> None:
        if not self.is_active:
            raise UserInactiveError("Пользователь деактивирован")
