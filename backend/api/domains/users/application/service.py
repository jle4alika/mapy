"""Application-сервис профиля."""

from __future__ import annotations

from uuid import UUID

from domains.users.application.dto import (
    UserMeDTO,
    UserNotificationSettingsDTO,
    UserPrivacySettingsDTO,
    UserPublicDTO,
)
from domains.users.application.mappers import UserMapper
from domains.users.application.ports import AbstractUserService, AbstractUserUnitOfWork
from domains.users.domain.errors import NotFoundError


class UserService(AbstractUserService):
    def __init__(self, uow: AbstractUserUnitOfWork) -> None:
        self._uow = uow

    async def get_public_profile(self, user_id: UUID) -> UserPublicDTO:
        user = await self._uow.users.get_by_id(user_id)
        if user is None or not user.is_active:
            raise NotFoundError("Пользователь не найден")
        return UserMapper.to_public(user)

    async def get_me_profile(self, user_id: UUID) -> UserMeDTO:
        user = await self._uow.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("Пользователь не найден")
        return UserMapper.to_me(user)

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
    ) -> UserMeDTO:
        user = await self._uow.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("Пользователь не найден")
        user.update_profile(
            display_name=display_name,
            avatar_url=avatar_url,
            bio=bio,
            clear_display_name=clear_display_name,
            clear_avatar_url=clear_avatar_url,
            clear_bio=clear_bio,
        )
        if clear_status or status_text is not None or status_emoji is not None:
            user.update_status(
                status_text=status_text,
                status_emoji=status_emoji,
                clear_status=clear_status,
            )
        saved = await self._uow.users.save(user)
        await self._uow.commit()
        return UserMapper.to_me(saved)

    async def get_privacy_settings(self, user_id: UUID) -> UserPrivacySettingsDTO:
        user = await self._uow.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("Пользователь не найден")
        settings = await self._uow.users.get_privacy_settings(user_id)
        return UserMapper.to_privacy(settings)

    async def update_privacy_settings(
        self,
        user_id: UUID,
        *,
        share_precise_location: bool | None = None,
        share_battery: bool | None = None,
        share_speed: bool | None = None,
        discoverable_in_search: bool | None = None,
        show_in_place_chats_as_nearby: bool | None = None,
    ) -> UserPrivacySettingsDTO:
        user = await self._uow.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("Пользователь не найден")
        settings = await self._uow.users.get_privacy_settings(user_id)
        settings.update(
            share_precise_location=share_precise_location,
            share_battery=share_battery,
            share_speed=share_speed,
            discoverable_in_search=discoverable_in_search,
            show_in_place_chats_as_nearby=show_in_place_chats_as_nearby,
        )
        saved = await self._uow.users.save_privacy_settings(settings)
        await self._uow.commit()
        return UserMapper.to_privacy(saved)

    async def get_notification_settings(self, user_id: UUID) -> UserNotificationSettingsDTO:
        user = await self._uow.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("Пользователь не найден")
        settings = await self._uow.users.get_notification_settings(user_id)
        return UserMapper.to_notifications(settings)

    async def update_notification_settings(
        self,
        user_id: UUID,
        *,
        dm_enabled: bool | None = None,
        friend_requests: bool | None = None,
        place_chat_activity: bool | None = None,
        friend_arrived: bool | None = None,
        system: bool | None = None,
    ) -> UserNotificationSettingsDTO:
        user = await self._uow.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("Пользователь не найден")
        settings = await self._uow.users.get_notification_settings(user_id)
        settings.update(
            dm_enabled=dm_enabled,
            friend_requests=friend_requests,
            place_chat_activity=place_chat_activity,
            friend_arrived=friend_arrived,
            system=system,
        )
        saved = await self._uow.users.save_notification_settings(settings)
        await self._uow.commit()
        return UserMapper.to_notifications(saved)

    async def schedule_account_deletion(self, user_id: UUID) -> None:
        from datetime import UTC, datetime, timedelta

        user = await self._uow.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("Пользователь не найден")
        user.schedule_deletion(datetime.now(UTC).replace(tzinfo=None) + timedelta(days=30))
        await self._uow.users.save(user)
        await self._uow.commit()
