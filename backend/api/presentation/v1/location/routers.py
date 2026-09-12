"""HTTP-ручки карты / локаций."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from domains.location.application.dto import ActivityItemDTO, FriendLocationDTO, LocationDTO
from domains.users.infrastructure.auth import CurrentActiveUser
from infrastructure.dependencies.rate_limiter import rate_limiter_factory
from presentation.v1.location.dependencies import LocationServiceDep

map_router = APIRouter(prefix="/map", tags=["map"])


class UpsertLocationBody(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    accuracy_m: float | None = Field(default=None, ge=0)
    speed_mps: float | None = Field(default=None, ge=0)
    heading_deg: float | None = Field(default=None, ge=0, le=360)
    battery_percent: int | None = Field(default=None, ge=0, le=100)
    is_moving: bool = False
    recorded_at: datetime | None = None


@map_router.get("/friends", response_model=list[FriendLocationDTO])
async def map_friends(
    user: CurrentActiveUser,
    service: LocationServiceDep,
) -> list[FriendLocationDTO]:
    return await service.get_friends_snapshot(user.id)


@map_router.post(
    "/location",
    response_model=LocationDTO,
    dependencies=[Depends(rate_limiter_factory("location", 60, 60))],
)
async def post_location(
    body: UpsertLocationBody,
    user: CurrentActiveUser,
    service: LocationServiceDep,
) -> LocationDTO:
    return await service.upsert_location(
        user.id,
        lat=body.lat,
        lon=body.lon,
        accuracy_m=body.accuracy_m,
        speed_mps=body.speed_mps,
        heading_deg=body.heading_deg,
        battery_percent=body.battery_percent,
        is_moving=body.is_moving,
        recorded_at=body.recorded_at,
    )


@map_router.get("/activity", response_model=list[ActivityItemDTO])
async def map_activity(
    user: CurrentActiveUser,
    service: LocationServiceDep,
) -> list[ActivityItemDTO]:
    return await service.get_activity_feed(user.id)
