"""Сущности геолокации."""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass
from datetime import datetime
from typing import ClassVar, Literal
from uuid import UUID

from domains.location.domain.errors import InvalidLocationError

DerivedStatus = Literal["moving", "stationary", "unknown"]
AccuracyMode = Literal["precise", "approximate", "stale"]


@dataclass(slots=True, kw_only=True)
class UserLocation:
    """Текущая позиция пользователя."""

    MIN_INTERVAL_SECONDS: ClassVar[float] = 2.0
    MIN_MOVE_METERS: ClassVar[float] = 15.0
    STALE_AFTER_SECONDS: ClassVar[float] = 300.0

    user_id: UUID
    lat: float
    lon: float
    accuracy_m: float | None = None
    speed_mps: float | None = None
    heading_deg: float | None = None
    battery_percent: int | None = None
    is_moving: bool = False
    derived_status: DerivedStatus = "unknown"
    recorded_at: datetime | None = None
    received_at: datetime | None = None

    @classmethod
    def validate_coords(cls, lat: float, lon: float) -> None:
        if not -90.0 <= lat <= 90.0:
            raise InvalidLocationError("Широта вне диапазона [-90, 90]")
        if not -180.0 <= lon <= 180.0:
            raise InvalidLocationError("Долгота вне диапазона [-180, 180]")

    @classmethod
    def validate_metrics(
        cls,
        *,
        accuracy_m: float | None,
        speed_mps: float | None,
        heading_deg: float | None,
        battery_percent: int | None,
    ) -> None:
        if accuracy_m is not None and accuracy_m < 0:
            raise InvalidLocationError("accuracy_m не может быть отрицательным")
        if speed_mps is not None and speed_mps < 0:
            raise InvalidLocationError("speed_mps не может быть отрицательным")
        if heading_deg is not None and not 0 <= heading_deg <= 360:
            raise InvalidLocationError("heading_deg: 0–360")
        if battery_percent is not None and not 0 <= battery_percent <= 100:
            raise InvalidLocationError("battery_percent: 0–100")

    @classmethod
    def derive_status(cls, *, speed_mps: float | None, is_moving: bool) -> DerivedStatus:
        if is_moving or (speed_mps is not None and speed_mps >= 0.8):
            return "moving"
        if speed_mps is not None and speed_mps < 0.3:
            return "stationary"
        if is_moving is False and speed_mps is None:
            return "stationary"
        return "unknown"

    def haversine_m(self, lat: float, lon: float) -> float:
        """Расстояние в метрах до точки."""
        r = 6371000.0
        p1, p2 = math.radians(self.lat), math.radians(lat)
        dphi = math.radians(lat - self.lat)
        dlmb = math.radians(lon - self.lon)
        a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
        return 2 * r * math.asin(math.sqrt(a))

    def should_accept(self, *, lat: float, lon: float, recorded_at: datetime, now: datetime) -> bool:
        """Throttle: минимум 2 с или смещение ≥ 15 м."""
        if self.recorded_at is None:
            return True
        dt = (recorded_at - self.recorded_at).total_seconds()
        if dt < 0:
            dt = (now - self.recorded_at).total_seconds()
        if dt >= self.MIN_INTERVAL_SECONDS:
            return True
        return self.haversine_m(lat, lon) >= self.MIN_MOVE_METERS

    def apply_update(
        self,
        *,
        lat: float,
        lon: float,
        accuracy_m: float | None,
        speed_mps: float | None,
        heading_deg: float | None,
        battery_percent: int | None,
        is_moving: bool,
        recorded_at: datetime,
        received_at: datetime,
    ) -> None:
        self.validate_coords(lat, lon)
        self.validate_metrics(
            accuracy_m=accuracy_m,
            speed_mps=speed_mps,
            heading_deg=heading_deg,
            battery_percent=battery_percent,
        )
        self.lat = lat
        self.lon = lon
        self.accuracy_m = accuracy_m
        self.speed_mps = speed_mps
        self.heading_deg = heading_deg
        self.battery_percent = battery_percent
        self.is_moving = is_moving
        self.derived_status = self.derive_status(speed_mps=speed_mps, is_moving=is_moving)
        self.recorded_at = recorded_at
        self.received_at = received_at


def approximate_offset(
    *,
    owner_id: UUID,
    viewer_id: UUID,
    day: str,
    lat: float,
    lon: float,
    radius_m: int,
) -> tuple[float, float]:
    """Детерминированное смещение внутри радиуса (стабильно в пределах суток)."""
    digest = hashlib.sha256(f"{owner_id}:{viewer_id}:{day}".encode()).digest()
    angle = (int.from_bytes(digest[:4], "big") / 0xFFFFFFFF) * 2 * math.pi
    dist = (int.from_bytes(digest[4:8], "big") / 0xFFFFFFFF) * radius_m
    # приближение: 1° широты ≈ 111320 м
    dlat = (dist * math.cos(angle)) / 111320.0
    cos_lat = max(math.cos(math.radians(lat)), 1e-6)
    dlon = (dist * math.sin(angle)) / (111320.0 * cos_lat)
    new_lat = max(-90.0, min(90.0, lat + dlat))
    new_lon = ((lon + dlon + 180.0) % 360.0) - 180.0
    return new_lat, new_lon
