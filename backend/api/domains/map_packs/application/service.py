"""Сервис офлайн-пакетов."""

from __future__ import annotations

from domains.map_packs.application.dto import MapPackFileDTO, MapRegionPackDTO
from domains.map_packs.application.ports import AbstractMapPacksService, AbstractMapPacksUnitOfWork
from domains.map_packs.domain.entities import MapRegionPack
from domains.map_packs.domain.errors import PackNotFoundError


def _to_dto(pack: MapRegionPack) -> MapRegionPackDTO:
    return MapRegionPackDTO(
        code=pack.code,
        title=pack.title,
        min_lat=pack.min_lat,
        min_lon=pack.min_lon,
        max_lat=pack.max_lat,
        max_lon=pack.max_lon,
        approx_size_bytes=pack.approx_size_bytes,
        version=pack.version,
        is_active=pack.is_active,
        files=[
            MapPackFileDTO(
                url=f.url,
                checksum_sha256=f.checksum_sha256,
                format=f.format,
                size_bytes=f.size_bytes,
            )
            for f in pack.files
        ],
    )


class MapPacksService(AbstractMapPacksService):
    def __init__(self, uow: AbstractMapPacksUnitOfWork) -> None:
        self._uow = uow

    async def list_packs(self) -> list[MapRegionPackDTO]:
        packs = await self._uow.packs.list_active()
        return [_to_dto(p) for p in packs]

    async def get_pack(self, code: str) -> MapRegionPackDTO:
        pack = await self._uow.packs.get_by_code(code)
        if pack is None or not pack.is_active:
            raise PackNotFoundError("Пакет не найден")
        return _to_dto(pack)
