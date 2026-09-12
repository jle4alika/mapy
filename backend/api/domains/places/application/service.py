"""Сервис мест."""

from __future__ import annotations

import logging
import time
from typing import Any
from uuid import UUID, uuid4

from domains.places.application.dto import PlaceDTO, PlaceFavoriteDTO
from domains.places.application.ports import AbstractPlacesService, AbstractPlacesUnitOfWork
from domains.places.domain.entities import Place, PlaceFavorite
from domains.places.domain.errors import PlaceNotFoundError
from domains.places.infrastructure.osm_sync import (
    bbox_span_ok,
    clamp_bbox_to_russia,
    element_to_place_row,
    fetch_overpass_elements,
    is_generic_place_name,
    resolve_place_name,
)

logger = logging.getLogger(__name__)

# Анти-флуд Overpass: одна ячейка ~раз в 10 минут
_SYNC_CACHE: dict[str, float] = {}
_SYNC_TTL_SEC = 600.0


def _to_dto(place: Place, *, chat_id: UUID | None = None) -> PlaceDTO:
    return PlaceDTO(
        id=place.id,
        source=place.source,
        name=place.name,
        place_type=place.place_type,
        lat=place.lat,
        lon=place.lon,
        address_text=place.address_text,
        is_public=place.is_public,
        osm_id=place.osm_id,
        creator_id=place.creator_id,
        metadata=place.metadata,
        has_chat=chat_id is not None,
        chat_id=chat_id,
        created_at=place.created_at,
    )


def _sync_cache_key(min_lon: float, min_lat: float, max_lon: float, max_lat: float) -> str:
    return (
        f"{round(min_lon, 2)}:{round(min_lat, 2)}:"
        f"{round(max_lon, 2)}:{round(max_lat, 2)}"
    )


class PlacesService(AbstractPlacesService):
    def __init__(self, uow: AbstractPlacesUnitOfWork) -> None:
        self._uow = uow

    async def create_user_place(
        self,
        creator_id: UUID,
        *,
        name: str,
        place_type: str,
        lat: float,
        lon: float,
        address_text: str | None = None,
        is_public: bool = True,
        metadata: dict[str, Any] | None = None,
    ) -> PlaceDTO:
        place = Place.create_user_place(
            id=uuid4(),
            creator_id=creator_id,
            name=name,
            place_type=place_type,
            lat=lat,
            lon=lon,
            address_text=address_text,
            is_public=is_public,
            metadata=metadata,
        )
        saved = await self._uow.places.add(place)
        await self._uow.commit()
        return _to_dto(saved)

    async def ensure_osm_place(
        self,
        *,
        osm_id: str,
        name: str,
        place_type: str,
        lat: float,
        lon: float,
        address_text: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> PlaceDTO:
        existing = await self._uow.places.get_by_osm_id(osm_id.strip())
        if existing is not None:
            return _to_dto(existing)
        cleaned = resolve_place_name(name, place_type=place_type or "custom")
        place = Place.create_osm_place(
            id=uuid4(),
            osm_id=osm_id,
            name=cleaned,
            place_type=place_type or "custom",
            lat=lat,
            lon=lon,
            address_text=address_text,
            metadata=metadata,
        )
        try:
            saved = await self._uow.places.add(place)
            await self._uow.commit()
            return _to_dto(saved)
        except Exception:
            # гонка по unique osm_id
            await self._uow.rollback()
            again = await self._uow.places.get_by_osm_id(osm_id.strip())
            if again is None:
                raise
            return _to_dto(again)

    async def get_place(self, place_id: UUID) -> PlaceDTO:
        place = await self._uow.places.get(place_id)
        if place is None:
            raise PlaceNotFoundError("Место не найдено")
        chat_id = await self._uow.places.get_place_chat_id(place_id)
        return _to_dto(place, chat_id=chat_id)

    async def _sync_osm_bbox(
        self,
        *,
        min_lon: float,
        min_lat: float,
        max_lon: float,
        max_lat: float,
    ) -> int:
        clamped = clamp_bbox_to_russia(min_lon, min_lat, max_lon, max_lat)
        if clamped is None or not bbox_span_ok(*clamped):
            return 0
        key = _sync_cache_key(*clamped)
        now = time.monotonic()
        if now - _SYNC_CACHE.get(key, 0.0) < _SYNC_TTL_SEC:
            return 0

        elements = await fetch_overpass_elements(*clamped)
        # кэш только после успешного ответа Overpass
        _SYNC_CACHE[key] = now
        inserted = 0
        for el in elements:
            row = element_to_place_row(el)
            if row is None:
                continue
            existing = await self._uow.places.get_by_osm_id(row["osm_id"])
            if existing is not None:
                # подтягиваем нормальное имя, если в базе была заглушка
                if is_generic_place_name(existing.name) and row["name"] and not is_generic_place_name(row["name"]):
                    try:
                        await self._uow.places.update_name(existing.id, row["name"])
                        inserted += 1  # считаем как обновление для commit
                    except Exception:
                        logger.debug("skip name refresh %s", row.get("osm_id"), exc_info=True)
                continue
            place = Place.create_osm_place(
                id=uuid4(),
                osm_id=row["osm_id"],
                name=row["name"],
                place_type=row["place_type"],
                lat=row["lat"],
                lon=row["lon"],
                address_text=row["address_text"],
                metadata=row["metadata"],
            )
            try:
                await self._uow.places.add(place)
                inserted += 1
            except Exception:
                # не откатываем всю пачку — только пропускаем конфликт
                logger.debug("skip osm place %s", row.get("osm_id"), exc_info=True)
                continue
        if inserted:
            try:
                await self._uow.commit()
                logger.info("OSM sync bbox %s: +%s places", key, inserted)
            except Exception:
                await self._uow.rollback()
                logger.exception("OSM sync commit failed")
                _SYNC_CACHE.pop(key, None)
                return 0
        return inserted

    async def list_bbox(
        self,
        *,
        min_lon: float,
        min_lat: float,
        max_lon: float,
        max_lat: float,
        types: list[str] | None = None,
        sync_osm: bool = True,
    ) -> list[PlaceDTO]:
        if sync_osm:
            try:
                await self._sync_osm_bbox(
                    min_lon=min_lon,
                    min_lat=min_lat,
                    max_lon=max_lon,
                    max_lat=max_lat,
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("OSM bbox sync skipped: %s", exc)
        places = await self._uow.places.list_in_bbox(
            min_lon=min_lon,
            min_lat=min_lat,
            max_lon=max_lon,
            max_lat=max_lat,
            place_types=types,
            limit=5000,
        )
        return [_to_dto(p) for p in places]

    async def add_favorite(self, user_id: UUID, place_id: UUID) -> PlaceFavoriteDTO:
        place = await self._uow.places.get(place_id)
        if place is None:
            raise PlaceNotFoundError("Место не найдено")
        fav = await self._uow.places.add_favorite(
            PlaceFavorite(user_id=user_id, place_id=place_id),
        )
        await self._uow.commit()
        return PlaceFavoriteDTO(place_id=place_id, place=_to_dto(place), created_at=fav.created_at)

    async def remove_favorite(self, user_id: UUID, place_id: UUID) -> None:
        await self._uow.places.remove_favorite(user_id, place_id)
        await self._uow.commit()

    async def list_favorites(self, user_id: UUID) -> list[PlaceFavoriteDTO]:
        favs = await self._uow.places.list_favorites(user_id)
        result: list[PlaceFavoriteDTO] = []
        for fav in favs:
            place = await self._uow.places.get(fav.place_id)
            result.append(
                PlaceFavoriteDTO(
                    place_id=fav.place_id,
                    place=_to_dto(place) if place else None,
                    created_at=fav.created_at,
                ),
            )
        return result
