"""DTO location."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from common.schemas.base import BaseDTO


class LocationDTO(BaseDTO):
    user_id: uuid.UUID
    lat: float
    lon: float
    accuracy_m: float | None = None
    speed_mps: float | None = None
    heading_deg: float | None = None
    battery_percent: int | None = None
    is_moving: bool = False
    derived_status: Literal["moving", "stationary", "unknown"] = "unknown"
    recorded_at: datetime | None = None


class FriendLocationDTO(BaseDTO):
    """Позиция друга для зрителя (с маскированием)."""

    user_id: uuid.UUID
    lat: float
    lon: float
    derived_status: Literal["moving", "stationary", "unknown"]
    speed_mps: float | None = None
    battery_percent: int | None = None
    recorded_at: datetime | None = None
    accuracy_mode: Literal["precise", "approximate", "stale"] = "precise"
    username: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None


class ActivityItemDTO(BaseDTO):
    """Элемент ленты активности на карте."""

    user_id: uuid.UUID
    username: str | None = None
    derived_status: Literal["moving", "stationary", "unknown"]
    recorded_at: datetime | None = None
