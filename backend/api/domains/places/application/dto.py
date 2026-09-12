"""DTO places."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from common.schemas.base import BaseDTO


class PlaceDTO(BaseDTO):
    id: uuid.UUID
    source: Literal["osm", "user"]
    name: str
    place_type: str
    lat: float
    lon: float
    address_text: str | None = None
    is_public: bool = True
    osm_id: str | None = None
    creator_id: uuid.UUID | None = None
    metadata: dict[str, Any] = {}
    has_chat: bool = False
    chat_id: uuid.UUID | None = None
    created_at: datetime | None = None


class PlaceFavoriteDTO(BaseDTO):
    place_id: uuid.UUID
    place: PlaceDTO | None = None
    created_at: datetime | None = None
