"""Маршруты регистрации push-устройств."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from domains.users.infrastructure.auth import CurrentActiveUser
from infrastructure.notifications.push import remove_device, upsert_device
from infrastructure.postgres.session import get_session

devices_router = APIRouter(prefix="/profile/devices", tags=["devices"])


class RegisterDeviceBody(BaseModel):
    expo_push_token: str = Field(..., min_length=16, max_length=255)
    platform: Literal["ios", "android", "web", "unknown"] = "unknown"
    device_id: str | None = Field(default=None, max_length=128)


class UnregisterDeviceBody(BaseModel):
    expo_push_token: str | None = Field(default=None, max_length=255)
    device_id: str | None = Field(default=None, max_length=128)


class DeviceDTO(BaseModel):
    id: str
    platform: str
    expo_push_token: str


@devices_router.post("", response_model=DeviceDTO)
async def register_device(
    body: RegisterDeviceBody,
    user: CurrentActiveUser,
    session: AsyncSession = Depends(get_session),
) -> DeviceDTO:
    row = await upsert_device(
        session,
        user_id=user.id,
        expo_push_token=body.expo_push_token,
        platform=body.platform,
        device_id=body.device_id,
    )
    return DeviceDTO(
        id=str(row.id),
        platform=row.platform,
        expo_push_token=row.expo_push_token,
    )


@devices_router.delete("", status_code=204)
async def unregister_device(
    body: UnregisterDeviceBody,
    user: CurrentActiveUser,
    session: AsyncSession = Depends(get_session),
) -> None:
    await remove_device(
        session,
        user_id=user.id,
        expo_push_token=body.expo_push_token,
        device_id=body.device_id,
    )
