"""Сервис геолокации."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from domains.friends.application.ports import AbstractFriendsUnitOfWork
from domains.location.application.dto import ActivityItemDTO, FriendLocationDTO, LocationDTO
from domains.location.application.ports import (
    AbstractLocationService,
    AbstractLocationUnitOfWork,
    AbstractPresencePublisher,
)
from domains.location.domain.entities import (
    UserLocation,
    approximate_offset,
)
from domains.location.domain.errors import LocationThrottledError
from domains.users.application.ports import AbstractUserUnitOfWork


class NoOpPresencePublisher(AbstractPresencePublisher):
    """Заглушка до подключения Redis."""

    async def publish_friend_location(
        self,
        *,
        friend_ids: list[UUID],
        payload: dict,
    ) -> None:
        return None


class LocationService(AbstractLocationService):
    def __init__(
        self,
        uow: AbstractLocationUnitOfWork,
        friends_uow: AbstractFriendsUnitOfWork,
        users_uow: AbstractUserUnitOfWork,
        presence: AbstractPresencePublisher | None = None,
    ) -> None:
        self._uow = uow
        self._friends_uow = friends_uow
        self._users_uow = users_uow
        self._presence = presence or NoOpPresencePublisher()

    def _now(self) -> datetime:
        return datetime.now(UTC).replace(tzinfo=None)

    async def upsert_location(
        self,
        user_id: UUID,
        *,
        lat: float,
        lon: float,
        accuracy_m: float | None = None,
        speed_mps: float | None = None,
        heading_deg: float | None = None,
        battery_percent: int | None = None,
        is_moving: bool = False,
        recorded_at: datetime | None = None,
    ) -> LocationDTO:
        now = self._now()
        recorded = recorded_at or now
        existing = await self._uow.locations.get(user_id)
        if existing is not None and not existing.should_accept(
            lat=lat,
            lon=lon,
            recorded_at=recorded,
            now=now,
        ):
            raise LocationThrottledError("Слишком частое обновление позиции")
        loc = existing or UserLocation(user_id=user_id, lat=lat, lon=lon)
        loc.apply_update(
            lat=lat,
            lon=lon,
            accuracy_m=accuracy_m,
            speed_mps=speed_mps,
            heading_deg=heading_deg,
            battery_percent=battery_percent,
            is_moving=is_moving,
            recorded_at=recorded,
            received_at=now,
        )
        saved = await self._uow.locations.upsert(loc)
        await self._uow.locations.append_history(saved)
        await self._uow.commit()

        # Приватный снимок для каждого друга (frozen / approximate)
        friend_ids = await self._friends_uow.friends.list_friend_ids(user_id)
        for friend_id in friend_ids:
            snapshot = await self.get_friends_snapshot(friend_id)
            for item in snapshot:
                if item.user_id != user_id:
                    continue
                frame = {
                    "type": "friend.location",
                    "payload": {
                        "user_id": str(item.user_id),
                        "lat": item.lat,
                        "lon": item.lon,
                        "derived_status": item.derived_status,
                        "speed_mps": item.speed_mps,
                        "battery_percent": item.battery_percent,
                        "recorded_at": item.recorded_at.isoformat() if item.recorded_at else None,
                        "accuracy_mode": item.accuracy_mode,
                        "display_name": item.display_name,
                        "username": item.username,
                        "avatar_url": item.avatar_url,
                    },
                }
                await self._presence.publish_friend_location(
                    friend_ids=[friend_id],
                    payload=frame,
                )
                break

        return LocationDTO(
            user_id=saved.user_id,
            lat=saved.lat,
            lon=saved.lon,
            accuracy_m=saved.accuracy_m,
            speed_mps=saved.speed_mps,
            heading_deg=saved.heading_deg,
            battery_percent=saved.battery_percent,
            is_moving=saved.is_moving,
            derived_status=saved.derived_status,
            recorded_at=saved.recorded_at,
        )

    async def get_friends_snapshot(self, viewer_id: UUID) -> list[FriendLocationDTO]:
        friend_ids = await self._friends_uow.friends.list_friend_ids(viewer_id)
        if not friend_ids:
            return []
        now = self._now()
        locations = await self._uow.locations.get_many(friend_ids)
        by_id = {loc.user_id: loc for loc in locations}
        overrides = await self._friends_uow.friends.list_active_visibility_for_viewer(
            viewer_id,
            now=now,
        )
        override_by_owner = {o.owner_id: o for o in overrides}
        day = now.date().isoformat()
        result: list[FriendLocationDTO] = []
        for fid in friend_ids:
            loc = by_id.get(fid)
            if loc is None:
                continue
            user = await self._users_uow.users.get_by_id(fid)
            lat, lon = loc.lat, loc.lon
            accuracy_mode: str = "precise"
            override = override_by_owner.get(fid)
            if override is not None and override.is_active(now):
                if override.mode == "frozen" and override.frozen_lat is not None:
                    lat = override.frozen_lat
                    lon = override.frozen_lon or lon
                    # зрителю заморозка выглядит как точная «застрявшая» точка
                    accuracy_mode = "precise"
                elif override.mode == "approximate":
                    lat, lon = approximate_offset(
                        owner_id=fid,
                        viewer_id=viewer_id,
                        day=day,
                        lat=lat,
                        lon=lon,
                        radius_m=override.approximate_radius_m,
                    )
                    accuracy_mode = "approximate"
            elif loc.recorded_at is not None:
                age = (now - loc.recorded_at).total_seconds()
                if age > UserLocation.STALE_AFTER_SECONDS:
                    accuracy_mode = "stale"
            result.append(
                FriendLocationDTO(
                    user_id=fid,
                    lat=lat,
                    lon=lon,
                    derived_status=loc.derived_status,
                    speed_mps=loc.speed_mps,
                    battery_percent=loc.battery_percent,
                    recorded_at=loc.recorded_at,
                    accuracy_mode=accuracy_mode,  # type: ignore[arg-type]
                    username=user.username if user else None,
                    display_name=user.display_name if user else None,
                    avatar_url=user.avatar_url if user else None,
                ),
            )
        return result

    async def get_activity_feed(self, viewer_id: UUID, *, limit: int = 50) -> list[ActivityItemDTO]:
        snapshot = await self.get_friends_snapshot(viewer_id)
        items = [
            ActivityItemDTO(
                user_id=s.user_id,
                username=s.username,
                derived_status=s.derived_status,
                recorded_at=s.recorded_at,
            )
            for s in snapshot
            if s.recorded_at is not None
        ]
        items.sort(key=lambda x: x.recorded_at or datetime.min, reverse=True)
        return items[:limit]
