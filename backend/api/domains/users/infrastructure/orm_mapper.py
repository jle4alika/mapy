"""ORM ↔ domain entity."""

from __future__ import annotations

from domains.users.domain.entities import (
    User,
    UserNotificationSettings,
    UserPrivacySettings,
)
from domains.users.infrastructure.models import (
    UserModel,
    UserNotificationSettingsModel,
    UserPrivacySettingsModel,
)


def to_entity(model: UserModel) -> User:
    return User(
        id=model.id,
        email=model.email,
        username=model.username,
        hashed_password=model.hashed_password,
        is_active=model.is_active,
        is_superuser=model.is_superuser,
        is_verified=model.is_verified,
        display_name=model.display_name,
        avatar_url=model.avatar_url,
        bio=model.bio,
        status_text=model.status_text,
        status_emoji=model.status_emoji,
        last_seen_at=model.last_seen_at,
        scheduled_deletion_at=model.scheduled_deletion_at,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def apply_entity(model: UserModel, user: User) -> None:
    """Перенести поля сущности в ORM-модель."""
    model.username = user.username
    model.email = user.email
    model.hashed_password = user.hashed_password
    model.is_active = user.is_active
    model.is_superuser = user.is_superuser
    model.is_verified = user.is_verified
    model.display_name = user.display_name
    model.avatar_url = user.avatar_url
    model.bio = user.bio
    model.status_text = user.status_text
    model.status_emoji = user.status_emoji
    model.last_seen_at = user.last_seen_at
    model.scheduled_deletion_at = user.scheduled_deletion_at


def privacy_to_entity(model: UserPrivacySettingsModel) -> UserPrivacySettings:
    return UserPrivacySettings(
        user_id=model.user_id,
        share_precise_location=model.share_precise_location,
        share_battery=model.share_battery,
        share_speed=model.share_speed,
        discoverable_in_search=model.discoverable_in_search,
        show_in_place_chats_as_nearby=model.show_in_place_chats_as_nearby,
    )


def apply_privacy(model: UserPrivacySettingsModel, settings: UserPrivacySettings) -> None:
    model.share_precise_location = settings.share_precise_location
    model.share_battery = settings.share_battery
    model.share_speed = settings.share_speed
    model.discoverable_in_search = settings.discoverable_in_search
    model.show_in_place_chats_as_nearby = settings.show_in_place_chats_as_nearby


def notifications_to_entity(
    model: UserNotificationSettingsModel,
) -> UserNotificationSettings:
    return UserNotificationSettings(
        user_id=model.user_id,
        dm_enabled=model.dm_enabled,
        friend_requests=model.friend_requests,
        place_chat_activity=model.place_chat_activity,
        friend_arrived=model.friend_arrived,
        system=model.system,
    )


def apply_notifications(
    model: UserNotificationSettingsModel,
    settings: UserNotificationSettings,
) -> None:
    model.dm_enabled = settings.dm_enabled
    model.friend_requests = settings.friend_requests
    model.place_chat_activity = settings.place_chat_activity
    model.friend_arrived = settings.friend_arrived
    model.system = settings.system
