"""HTTP-ручки мест и избранного."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from domains.places.application.dto import PlaceDTO, PlaceFavoriteDTO
from domains.users.infrastructure.auth import CurrentActiveUser
from infrastructure.dependencies.rate_limiter import rate_limiter_factory
from presentation.v1.places.dependencies import PlacesServiceDep

map_places_router = APIRouter(prefix="/map/places", tags=["places"])
favorites_router = APIRouter(prefix="/profile/favorite-places", tags=["favorites"])


class CreatePlaceBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    place_type: str = Field(default="custom", max_length=64)
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    address_text: str | None = None
    is_public: bool = True
    metadata: dict[str, Any] | None = None


class EnsureOsmPlaceBody(BaseModel):
    osm_id: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=120)
    place_type: str = Field(default="custom", max_length=64)
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    address_text: str | None = None
    metadata: dict[str, Any] | None = None


class FavoriteBody(BaseModel):
    place_id: uuid.UUID


@map_places_router.post(
    "",
    response_model=PlaceDTO,
    dependencies=[Depends(rate_limiter_factory("create_place", 20, 3600))],
)
async def create_place(
    body: CreatePlaceBody,
    user: CurrentActiveUser,
    service: PlacesServiceDep,
) -> PlaceDTO:
    return await service.create_user_place(
        user.id,
        name=body.name,
        place_type=body.place_type,
        lat=body.lat,
        lon=body.lon,
        address_text=body.address_text,
        is_public=body.is_public,
        metadata=body.metadata,
    )


@map_places_router.post(
    "/ensure-osm",
    response_model=PlaceDTO,
    dependencies=[Depends(rate_limiter_factory("ensure_osm_place", 120, 3600))],
)
async def ensure_osm_place(
    body: EnsureOsmPlaceBody,
    user: CurrentActiveUser,
    service: PlacesServiceDep,
) -> PlaceDTO:
    return await service.ensure_osm_place(
        osm_id=body.osm_id,
        name=body.name,
        place_type=body.place_type,
        lat=body.lat,
        lon=body.lon,
        address_text=body.address_text,
        metadata=body.metadata,
    )


@map_places_router.get("", response_model=list[PlaceDTO])
async def list_places_bbox(
    service: PlacesServiceDep,
    user: CurrentActiveUser,
    bbox: str = Query(..., description="min_lon,min_lat,max_lon,max_lat"),
    types: str | None = Query(default=None, description="через запятую"),
    sync_osm: bool = Query(default=True, description="подтянуть OSM POI по bbox (РФ)"),
) -> list[PlaceDTO]:
    parts = [float(x.strip()) for x in bbox.split(",")]
    if len(parts) != 4:
        from domains.places.domain.errors import InvalidPlaceError

        raise InvalidPlaceError("bbox: min_lon,min_lat,max_lon,max_lat")
    type_list = [t.strip() for t in types.split(",") if t.strip()] if types else None
    return await service.list_bbox(
        min_lon=parts[0],
        min_lat=parts[1],
        max_lon=parts[2],
        max_lat=parts[3],
        types=type_list,
        sync_osm=sync_osm,
    )


@map_places_router.get("/{place_id}", response_model=PlaceDTO)
async def get_place(
    place_id: uuid.UUID,
    user: CurrentActiveUser,
    service: PlacesServiceDep,
) -> PlaceDTO:
    return await service.get_place(place_id)


@favorites_router.get("", response_model=list[PlaceFavoriteDTO])
async def list_favorites(
    user: CurrentActiveUser,
    service: PlacesServiceDep,
) -> list[PlaceFavoriteDTO]:
    return await service.list_favorites(user.id)


@favorites_router.post("", response_model=PlaceFavoriteDTO)
async def add_favorite(
    body: FavoriteBody,
    user: CurrentActiveUser,
    service: PlacesServiceDep,
) -> PlaceFavoriteDTO:
    return await service.add_favorite(user.id, body.place_id)


@favorites_router.delete("/{place_id}", status_code=204)
async def remove_favorite(
    place_id: uuid.UUID,
    user: CurrentActiveUser,
    service: PlacesServiceDep,
) -> None:
    await service.remove_favorite(user.id, place_id)
