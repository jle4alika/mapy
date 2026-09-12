"""Репозиторий локаций."""

from __future__ import annotations

from uuid import UUID, uuid4

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from domains.location.application.ports import AbstractLocationRepository
from domains.location.domain.entities import UserLocation
from domains.location.infrastructure.models import LocationHistoryModel, UserLocationModel
from domains.location.infrastructure.orm_mapper import to_entity


class LocationRepository(AbstractLocationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, user_id: UUID) -> UserLocation | None:
        m = await self._session.get(UserLocationModel, user_id)
        return to_entity(m) if m else None

    async def upsert(self, location: UserLocation) -> UserLocation:
        m = await self._session.get(UserLocationModel, location.user_id)
        if m is None:
            m = UserLocationModel(user_id=location.user_id)
            self._session.add(m)
        m.lat = location.lat
        m.lon = location.lon
        m.accuracy_m = location.accuracy_m
        m.speed_mps = location.speed_mps
        m.heading_deg = location.heading_deg
        m.battery_percent = location.battery_percent
        m.is_moving = location.is_moving
        m.derived_status = location.derived_status
        m.recorded_at = location.recorded_at
        m.received_at = location.received_at
        await self._session.flush()
        # geom через PostGIS
        await self._session.execute(
            text(
                "UPDATE user_locations SET geom = "
                "ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography "
                "WHERE user_id = :uid",
            ),
            {"lon": location.lon, "lat": location.lat, "uid": location.user_id},
        )
        await self._session.refresh(m)
        return to_entity(m)

    async def get_many(self, user_ids: list[UUID]) -> list[UserLocation]:
        if not user_ids:
            return []
        result = await self._session.execute(
            select(UserLocationModel).where(UserLocationModel.user_id.in_(user_ids)),
        )
        return [to_entity(m) for m in result.scalars().all()]

    async def append_history(self, location: UserLocation) -> None:
        hist = LocationHistoryModel(
            id=uuid4(),
            user_id=location.user_id,
            lat=location.lat,
            lon=location.lon,
            accuracy_m=location.accuracy_m,
            speed_mps=location.speed_mps,
            derived_status=location.derived_status,
            recorded_at=location.recorded_at,
        )
        self._session.add(hist)
        await self._session.flush()
        await self._session.execute(
            text(
                "UPDATE location_history SET geom = "
                "ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography "
                "WHERE id = :hid",
            ),
            {"lon": location.lon, "lat": location.lat, "hid": hist.id},
        )
