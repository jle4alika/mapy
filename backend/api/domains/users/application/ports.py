"""Порты application-слоя users."""

from __future__ import annotations

from abc import ABC, abstractmethod
from types import TracebackType
from typing import Self
from uuid import UUID

from domains.users.application.dto import (
    UserMeDTO,
    UserNotificationSettingsDTO,
    UserPrivacySettingsDTO,
    UserPublicDTO,
)
from domains.users.domain.entities import (
    User,
    UserNotificationSettings,
    UserPrivacySettings,
)


class AbstractUserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> User | None: ...

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def get_by_username(self, username: str) -> User | None: ...

    @abstractmethod
    async def search_by_username(
        self,
        query: str,
        *,
        exclude_id: UUID | None = None,
        limit: int = 12,
    ) -> list[User]: ...

    @abstractmethod
    async def is_username_taken(
        self,
        username: str,
        *,
        exclude_id: UUID | None = None,
    ) -> bool: ...

    @abstractmethod
    async def list_active(self, *, limit: int = 50, offset: int = 0) -> list[User]: ...

    @abstractmethod
    async def save(self, user: User) -> User: ...

    @abstractmethod
    async def get_privacy_settings(self, user_id: UUID) -> UserPrivacySettings: ...

    @abstractmethod
    async def save_privacy_settings(
        self,
        settings: UserPrivacySettings,
    ) -> UserPrivacySettings: ...

    @abstractmethod
    async def get_notification_settings(self, user_id: UUID) -> UserNotificationSettings: ...

    @abstractmethod
    async def save_notification_settings(
        self,
        settings: UserNotificationSettings,
    ) -> UserNotificationSettings: ...


class AbstractUserUnitOfWork(ABC):
    users: AbstractUserRepository

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


class AbstractUserService(ABC):
    @abstractmethod
    async def get_public_profile(self, user_id: UUID) -> UserPublicDTO: ...

    @abstractmethod
    async def get_me_profile(self, user_id: UUID) -> UserMeDTO: ...

    @abstractmethod
    async def update_me_profile(
        self,
        user_id: UUID,
        *,
        display_name: str | None = None,
        avatar_url: str | None = None,
        bio: str | None = None,
        status_text: str | None = None,
        status_emoji: str | None = None,
        clear_display_name: bool = False,
        clear_avatar_url: bool = False,
        clear_bio: bool = False,
        clear_status: bool = False,
    ) -> UserMeDTO: ...

    @abstractmethod
    async def get_privacy_settings(self, user_id: UUID) -> UserPrivacySettingsDTO: ...

    @abstractmethod
    async def update_privacy_settings(
        self,
        user_id: UUID,
        *,
        share_precise_location: bool | None = None,
        share_battery: bool | None = None,
        share_speed: bool | None = None,
        discoverable_in_search: bool | None = None,
        show_in_place_chats_as_nearby: bool | None = None,
    ) -> UserPrivacySettingsDTO: ...

    @abstractmethod
    async def get_notification_settings(self, user_id: UUID) -> UserNotificationSettingsDTO: ...

    @abstractmethod
    async def update_notification_settings(
        self,
        user_id: UUID,
        *,
        dm_enabled: bool | None = None,
        friend_requests: bool | None = None,
        place_chat_activity: bool | None = None,
        friend_arrived: bool | None = None,
        system: bool | None = None,
    ) -> UserNotificationSettingsDTO: ...

    @abstractmethod
    async def schedule_account_deletion(self, user_id: UUID) -> None: ...
