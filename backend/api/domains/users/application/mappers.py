"""Маппинг domain.User → DTO ответов."""

from __future__ import annotations

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


class UserMapper:
    @classmethod
    def to_public(cls, user: User) -> UserPublicDTO:
        return UserPublicDTO(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
            bio=user.bio,
            status_text=user.status_text,
            status_emoji=user.status_emoji,
            last_seen_at=user.last_seen_at,
            created_at=user.created_at,
        )

    @classmethod
    def to_me(cls, user: User) -> UserMeDTO:
        return UserMeDTO(
            id=user.id,
            username=user.username,
            created_at=user.created_at,
            email=user.email,
            is_active=user.is_active,
            is_verified=user.is_verified,
            is_superuser=user.is_superuser,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
            bio=user.bio,
            status_text=user.status_text,
            status_emoji=user.status_emoji,
            last_seen_at=user.last_seen_at,
            scheduled_deletion_at=user.scheduled_deletion_at,
            updated_at=user.updated_at,
        )

    @classmethod
    def to_privacy(cls, settings: UserPrivacySettings) -> UserPrivacySettingsDTO:
        return UserPrivacySettingsDTO(
            share_precise_location=settings.share_precise_location,
            share_battery=settings.share_battery,
            share_speed=settings.share_speed,
            discoverable_in_search=settings.discoverable_in_search,
            show_in_place_chats_as_nearby=settings.show_in_place_chats_as_nearby,
        )

    @classmethod
    def to_notifications(
        cls,
        settings: UserNotificationSettings,
    ) -> UserNotificationSettingsDTO:
        return UserNotificationSettingsDTO(
            dm_enabled=settings.dm_enabled,
            friend_requests=settings.friend_requests,
            place_chat_activity=settings.place_chat_activity,
            friend_arrived=settings.friend_arrived,
            system=settings.system,
        )
