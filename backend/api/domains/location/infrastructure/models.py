"""ORM-модели локаций."""

from __future__ import annotations

import uuid
from datetime import datetime

from geoalchemy2 import Geography
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.postgres.base import Base, UUIDBase
from infrastructure.postgres.mixins import UTC_NOW


class UserLocationModel(Base):
    """Текущая позиция (одна строка на пользователя)."""

    __tablename__ = "user_locations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    geom = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=True,
    )
    accuracy_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    speed_mps: Mapped[float | None] = mapped_column(Float, nullable=True)
    heading_deg: Mapped[float | None] = mapped_column(Float, nullable=True)
    battery_percent: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_moving: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    derived_status: Mapped[str] = mapped_column(String(32), nullable=False, default="unknown")
    recorded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)


class LocationHistoryModel(UUIDBase):
    """История позиций (с TTL через Celery)."""

    __tablename__ = "location_history"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    geom = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=True,
    )
    accuracy_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    speed_mps: Mapped[float | None] = mapped_column(Float, nullable=True)
    derived_status: Mapped[str] = mapped_column(String(32), nullable=False, default="unknown")
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=UTC_NOW,
        index=True,
    )
