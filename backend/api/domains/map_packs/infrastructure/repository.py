"""Репозиторий map_packs."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from domains.map_packs.application.ports import AbstractMapPacksRepository
from domains.map_packs.domain.entities import MapPackFile, MapRegionPack
from domains.map_packs.infrastructure.models import MapRegionPackModel


def _to_entity(m: MapRegionPackModel) -> MapRegionPack:
    return MapRegionPack(
        id=m.id,
        code=m.code,
        title=m.title,
        min_lat=m.min_lat,
        min_lon=m.min_lon,
        max_lat=m.max_lat,
        max_lon=m.max_lon,
        approx_size_bytes=m.approx_size_bytes,
        version=m.version,
        is_active=m.is_active,
        files=[
            MapPackFile(
                id=f.id,
                pack_id=f.pack_id,
                url=f.url,
                checksum_sha256=f.checksum_sha256,
                format=f.format,  # type: ignore[arg-type]
                size_bytes=f.size_bytes,
            )
            for f in (m.files or [])
        ],
        created_at=m.created_at,
    )


class MapPacksRepository(AbstractMapPacksRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_active(self) -> list[MapRegionPack]:
        result = await self._session.execute(
            select(MapRegionPackModel)
            .where(MapRegionPackModel.is_active.is_(True))
            .options(selectinload(MapRegionPackModel.files))
            .order_by(MapRegionPackModel.code),
        )
        return [_to_entity(m) for m in result.scalars().all()]

    async def get_by_code(self, code: str) -> MapRegionPack | None:
        result = await self._session.execute(
            select(MapRegionPackModel)
            .where(MapRegionPackModel.code == code)
            .options(selectinload(MapRegionPackModel.files)),
        )
        m = result.scalars().one_or_none()
        return _to_entity(m) if m else None
