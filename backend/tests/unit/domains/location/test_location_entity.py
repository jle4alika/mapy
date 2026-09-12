"""Юнит-тесты маскировки гео."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from domains.location.domain.entities import UserLocation, approximate_offset


def test_validate_and_derive_status() -> None:
    UserLocation.validate_coords(55.75, 37.62)
    status = UserLocation.derive_status(speed_mps=0.1, is_moving=False)
    assert status == "stationary"
    loc = UserLocation(user_id=uuid4(), lat=55.75, lon=37.62)
    now = datetime.now(UTC).replace(tzinfo=None)
    loc.apply_update(
        lat=55.76,
        lon=37.63,
        accuracy_m=10,
        speed_mps=5.0,
        heading_deg=90,
        battery_percent=80,
        is_moving=True,
        recorded_at=now,
        received_at=now,
    )
    assert loc.derived_status == "moving"


def test_approximate_stable_same_day() -> None:
    owner, viewer = uuid4(), uuid4()
    a1, b1 = approximate_offset(
        owner_id=owner,
        viewer_id=viewer,
        day="2026-09-09",
        lat=55.75,
        lon=37.62,
        radius_m=500,
    )
    a2, b2 = approximate_offset(
        owner_id=owner,
        viewer_id=viewer,
        day="2026-09-09",
        lat=55.75,
        lon=37.62,
        radius_m=500,
    )
    assert (a1, b1) == (a2, b2)
    assert abs(a1 - 55.75) < 0.1
    assert abs(b1 - 37.62) < 0.1
