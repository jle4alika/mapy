"""DTO ответов friends."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from common.schemas.base import BaseDTO


class FriendDTO(BaseDTO):
    user_id: uuid.UUID
    username: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    since: datetime | None = None


class FriendRequestDTO(BaseDTO):
    id: uuid.UUID
    from_user_id: uuid.UUID
    to_user_id: uuid.UUID
    status: Literal["pending", "accepted", "rejected", "cancelled"]
    message: str | None = None
    created_at: datetime | None = None


class InviteInfoDTO(BaseDTO):
    username: str
    deep_link: str
    web_link: str
    share_text: str


class VisibilityOverrideDTO(BaseDTO):
    viewer_id: uuid.UUID
    mode: Literal["normal", "frozen", "approximate"]
    frozen_lat: float | None = None
    frozen_lon: float | None = None
    approximate_radius_m: int | None = None
    expires_at: datetime | None = None
