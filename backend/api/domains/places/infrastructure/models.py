"""ORM-модели places."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, Uuid, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB

from infrastructure.postgres.base import Base, UUIDBase
from infrastructure.postgres.mixins import UTC_NOW


class PlaceModel(UUIDBase):
    __tablename__ = "places"

    source: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    osm_id: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    creator_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    place_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    address_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    geom = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        default=dict,
    )


class PlaceFavoriteModel(Base):
    __tablename__ = "place_favorites"
    __table_args__ = (UniqueConstraint("user_id", "place_id", name="uq_place_favorites"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    place_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("places.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=UTC_NOW,
        nullable=False,
    )
