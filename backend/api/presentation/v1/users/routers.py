"""Profile HTTP routes (v1).

Паттерн новой ручки:
  - response_model = DTO из domains.*.application.dto
  - логика только в service (Depends UserServiceDep)
  - domain errors → глобальные handlers в app.py
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, File, UploadFile
from fastapi_cache.decorator import cache
from pydantic import BaseModel, Field

from presentation.v1.users.dependencies import UserServiceDep
from common.exceptions.errors import AppError
from core.config import settings
from domains.users.application.dto import (
    UserMeDTO,
    UserNotificationSettingsDTO,
    UserPrivacySettingsDTO,
    UserPublicDTO,
)
from domains.users.infrastructure.auth import CurrentActiveUser
from infrastructure.cache import key_builder

router = APIRouter(prefix="/profile", tags=["profile"])


class UpdateProfileRequest(BaseModel):
    """Тело PATCH /profile/me."""

    display_name: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=512)
    bio: str | None = Field(default=None, max_length=500)
    status_text: str | None = Field(default=None, max_length=160)
    status_emoji: str | None = Field(default=None, max_length=32)
    clear_display_name: bool = False
    clear_avatar_url: bool = False
    clear_bio: bool = False
    clear_status: bool = False


class UpdatePrivacyRequest(BaseModel):
    share_precise_location: bool | None = None
    share_battery: bool | None = None
    share_speed: bool | None = None
    discoverable_in_search: bool | None = None
    show_in_place_chats_as_nearby: bool | None = None


class UpdateNotificationsRequest(BaseModel):
    dm_enabled: bool | None = None
    friend_requests: bool | None = None
    place_chat_activity: bool | None = None
    friend_arrived: bool | None = None
    system: bool | None = None


@router.get("/me", response_model=UserMeDTO)
@cache(
    expire=settings.cache.EXPIRE_SECONDS,
    namespace=settings.cache.NAMESPACE_ME,
    key_builder=key_builder,
)
async def get_me_cached(
    user: CurrentActiveUser,
    service: UserServiceDep,
) -> UserMeDTO:
    return await service.get_me_profile(user.id)


@router.patch("/me", response_model=UserMeDTO)
async def patch_me(
    body: UpdateProfileRequest,
    user: CurrentActiveUser,
    service: UserServiceDep,
) -> UserMeDTO:
    return await service.update_me_profile(
        user.id,
        display_name=body.display_name,
        avatar_url=body.avatar_url,
        bio=body.bio,
        status_text=body.status_text,
        status_emoji=body.status_emoji,
        clear_display_name=body.clear_display_name,
        clear_avatar_url=body.clear_avatar_url,
        clear_bio=body.clear_bio,
        clear_status=body.clear_status,
    )


@router.post("/me/avatar", response_model=UserMeDTO)
async def upload_avatar(
    user: CurrentActiveUser,
    service: UserServiceDep,
    file: UploadFile = File(...),
) -> UserMeDTO:
    """Загрузка аватара в локальное хранилище."""
    from infrastructure.storage.local import local_object_storage

    content_type = file.content_type or "application/octet-stream"
    if not content_type.startswith("image/"):
        raise AppError("Аватар должен быть изображением")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise AppError("Аватар больше 5 МБ")
    ext = "jpg"
    if "png" in content_type:
        ext = "png"
    elif "webp" in content_type:
        ext = "webp"
    key = f"avatars/{user.id}.{ext}"
    url = await local_object_storage.save(key=key, data=data, content_type=content_type)
    return await service.update_me_profile(user.id, avatar_url=url)


@router.delete("/me", status_code=204)
async def schedule_deletion(
    user: CurrentActiveUser,
    service: UserServiceDep,
) -> None:
    """Планирует удаление аккаунта (мягкая деактивация)."""
    await service.schedule_account_deletion(user.id)


@router.get("/privacy", response_model=UserPrivacySettingsDTO)
async def get_privacy(
    user: CurrentActiveUser,
    service: UserServiceDep,
) -> UserPrivacySettingsDTO:
    return await service.get_privacy_settings(user.id)


@router.put("/privacy", response_model=UserPrivacySettingsDTO)
async def put_privacy(
    body: UpdatePrivacyRequest,
    user: CurrentActiveUser,
    service: UserServiceDep,
) -> UserPrivacySettingsDTO:
    return await service.update_privacy_settings(
        user.id,
        share_precise_location=body.share_precise_location,
        share_battery=body.share_battery,
        share_speed=body.share_speed,
        discoverable_in_search=body.discoverable_in_search,
        show_in_place_chats_as_nearby=body.show_in_place_chats_as_nearby,
    )


@router.get("/notification-settings", response_model=UserNotificationSettingsDTO)
async def get_notifications(
    user: CurrentActiveUser,
    service: UserServiceDep,
) -> UserNotificationSettingsDTO:
    return await service.get_notification_settings(user.id)


@router.put("/notification-settings", response_model=UserNotificationSettingsDTO)
async def put_notifications(
    body: UpdateNotificationsRequest,
    user: CurrentActiveUser,
    service: UserServiceDep,
) -> UserNotificationSettingsDTO:
    return await service.update_notification_settings(
        user.id,
        dm_enabled=body.dm_enabled,
        friend_requests=body.friend_requests,
        place_chat_activity=body.place_chat_activity,
        friend_arrived=body.friend_arrived,
        system=body.system,
    )


# Публичный профиль: не /{user_id} — иначе перехватывает /profile/favorite-places и т.п.
@router.get("/by-id/{user_id}", response_model=UserPublicDTO)
@cache(
    expire=settings.cache.EXPIRE_SECONDS,
    namespace=settings.cache.NAMESPACE_USER,
    key_builder=key_builder,
)
async def get_user_public(
    user_id: uuid.UUID,
    service: UserServiceDep,
) -> UserPublicDTO:
    return await service.get_public_profile(user_id)
