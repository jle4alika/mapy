"""ORM ↔ domain location."""

from __future__ import annotations

from domains.location.domain.entities import UserLocation
from domains.location.infrastructure.models import UserLocationModel


def to_entity(m: UserLocationModel) -> UserLocation:
    return UserLocation(
        user_id=m.user_id,
        lat=m.lat,
        lon=m.lon,
        accuracy_m=m.accuracy_m,
        speed_mps=m.speed_mps,
        heading_deg=m.heading_deg,
        battery_percent=m.battery_percent,
        is_moving=m.is_moving,
        derived_status=m.derived_status,  # type: ignore[arg-type]
        recorded_at=m.recorded_at,
        received_at=m.received_at,
    )
