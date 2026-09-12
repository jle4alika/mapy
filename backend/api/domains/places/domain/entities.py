"""Сущности мест."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar, Literal
from uuid import UUID

from domains.places.domain.errors import InvalidPlaceError

PlaceSource = Literal["osm", "user"]


@dataclass(slots=True, kw_only=True)
class Place:
    MAX_NAME: ClassVar[int] = 120

    id: UUID
    source: PlaceSource
    name: str
    place_type: str
    lat: float
    lon: float
    osm_id: str | None = None
    creator_id: UUID | None = None
    address_text: str | None = None
    is_public: bool = True
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def create_user_place(
        cls,
        *,
        id: UUID,
        creator_id: UUID,
        name: str,
        place_type: str,
        lat: float,
        lon: float,
        address_text: str | None = None,
        is_public: bool = True,
        metadata: dict[str, Any] | None = None,
    ) -> Place:
        name_clean = name.strip()
        if not name_clean or len(name_clean) > cls.MAX_NAME:
            raise InvalidPlaceError(f"name: 1–{cls.MAX_NAME} символов")
        if not -90 <= lat <= 90 or not -180 <= lon <= 180:
            raise InvalidPlaceError("Координаты вне диапазона")
        return cls(
            id=id,
            source="user",
            osm_id=None,
            creator_id=creator_id,
            name=name_clean,
            place_type=place_type.strip() or "custom",
            address_text=(address_text or "").strip() or None,
            lat=lat,
            lon=lon,
            is_public=is_public,
            metadata=metadata or {},
        )

    @classmethod
    def create_osm_place(
        cls,
        *,
        id: UUID,
        osm_id: str,
        name: str,
        place_type: str,
        lat: float,
        lon: float,
        address_text: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Place:
        osm_clean = (osm_id or "").strip()
        if not osm_clean or len(osm_clean) > 64:
            raise InvalidPlaceError("osm_id обязателен (до 64 символов)")
        name_clean = name.strip()
        if not name_clean or len(name_clean) > cls.MAX_NAME:
            raise InvalidPlaceError(f"name: 1–{cls.MAX_NAME} символов")
        if not -90 <= lat <= 90 or not -180 <= lon <= 180:
            raise InvalidPlaceError("Координаты вне диапазона")
        return cls(
            id=id,
            source="osm",
            osm_id=osm_clean,
            creator_id=None,
            name=name_clean,
            place_type=place_type.strip() or "custom",
            address_text=(address_text or "").strip() or None,
            lat=lat,
            lon=lon,
            is_public=True,
            metadata=metadata or {},
        )


@dataclass(slots=True, kw_only=True)
class PlaceFavorite:
    user_id: UUID
    place_id: UUID
    created_at: datetime | None = None
