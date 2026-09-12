"""HTTP-ручки офлайн-пакетов."""

from __future__ import annotations

from fastapi import APIRouter

from domains.map_packs.application.dto import MapRegionPackDTO
from domains.users.infrastructure.auth import CurrentActiveUser
from presentation.v1.map_packs.dependencies import MapPacksServiceDep

offline_packs_router = APIRouter(prefix="/map/offline-packs", tags=["map-packs"])


@offline_packs_router.get("", response_model=list[MapRegionPackDTO])
async def list_packs(
    user: CurrentActiveUser,
    service: MapPacksServiceDep,
) -> list[MapRegionPackDTO]:
    return await service.list_packs()


@offline_packs_router.get("/{code}", response_model=MapRegionPackDTO)
async def get_pack(
    code: str,
    user: CurrentActiveUser,
    service: MapPacksServiceDep,
) -> MapRegionPackDTO:
    return await service.get_pack(code)
