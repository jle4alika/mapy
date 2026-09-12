"""Репозиторий places."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import and_, delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from domains.places.application.ports import AbstractPlacesRepository
from domains.places.domain.entities import Place, PlaceFavorite
from domains.places.infrastructure.models import PlaceFavoriteModel, PlaceModel
from domains.places.infrastructure.orm_mapper import favorite_to_entity, to_entity


class PlacesRepository(AbstractPlacesRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, place_id: UUID) -> Place | None:
        m = await self._session.get(PlaceModel, place_id)
        return to_entity(m) if m else None

    async def get_by_osm_id(self, osm_id: str) -> Place | None:
        result = await self._session.execute(
            select(PlaceModel).where(PlaceModel.osm_id == osm_id),
        )
        m = result.scalars().one_or_none()
        return to_entity(m) if m else None

    async def add(self, place: Place) -> Place:
        m = PlaceModel(
            id=place.id,
            source=place.source,
            osm_id=place.osm_id,
            creator_id=place.creator_id,
            name=place.name,
            place_type=place.place_type,
            address_text=place.address_text,
            lat=place.lat,
            lon=place.lon,
            is_public=place.is_public,
            metadata_json=place.metadata,
        )
        self._session.add(m)
        await self._session.flush()
        await self._session.execute(
            text(
                "UPDATE places SET geom = "
                "ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography WHERE id = :pid",
            ),
            {"lon": place.lon, "lat": place.lat, "pid": place.id},
        )
        await self._session.refresh(m)
        return to_entity(m)

    async def update_name(self, place_id: UUID, name: str) -> None:
        m = await self._session.get(PlaceModel, place_id)
        if m is None:
            return
        m.name = name
        await self._session.flush()

    async def list_in_bbox(
        self,
        *,
        min_lon: float,
        min_lat: float,
        max_lon: float,
        max_lat: float,
        place_types: list[str] | None = None,
        limit: int = 5000,
    ) -> list[Place]:
        # Простой фильтр по lat/lon (надёжнее без зависимости от geom)
        q = select(PlaceModel).where(
            and_(
                PlaceModel.lat >= min_lat,
                PlaceModel.lat <= max_lat,
                PlaceModel.lon >= min_lon,
                PlaceModel.lon <= max_lon,
                PlaceModel.is_public.is_(True),
            ),
        )
        if place_types:
            q = q.where(PlaceModel.place_type.in_(place_types))
        q = q.order_by(PlaceModel.updated_at.desc().nullslast(), PlaceModel.name.asc()).limit(limit)
        result = await self._session.execute(q)
        return [to_entity(m) for m in result.scalars().all()]

    async def add_favorite(self, fav: PlaceFavorite) -> PlaceFavorite:
        existing = await self._session.get(
            PlaceFavoriteModel,
            {"user_id": fav.user_id, "place_id": fav.place_id},
        )
        if existing is not None:
            return favorite_to_entity(existing)
        m = PlaceFavoriteModel(user_id=fav.user_id, place_id=fav.place_id)
        self._session.add(m)
        await self._session.flush()
        return favorite_to_entity(m)

    async def remove_favorite(self, user_id: UUID, place_id: UUID) -> None:
        await self._session.execute(
            delete(PlaceFavoriteModel).where(
                PlaceFavoriteModel.user_id == user_id,
                PlaceFavoriteModel.place_id == place_id,
            ),
        )

    async def list_favorites(self, user_id: UUID) -> list[PlaceFavorite]:
        result = await self._session.execute(
            select(PlaceFavoriteModel).where(PlaceFavoriteModel.user_id == user_id),
        )
        return [favorite_to_entity(m) for m in result.scalars().all()]

    async def get_place_chat_id(self, place_id: UUID) -> UUID | None:
        # Ленивый импорт, чтобы не создавать жёсткий цикл моделей на уровне пакета
        from domains.chats.infrastructure.models import PlaceChatModel

        result = await self._session.execute(
            select(PlaceChatModel.chat_id).where(PlaceChatModel.place_id == place_id),
        )
        return result.scalar_one_or_none()
