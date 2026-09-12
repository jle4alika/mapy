"""ORM map_packs."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from infrastructure.postgres.base import UUIDBase


class MapRegionPackModel(UUIDBase):
    __tablename__ = "map_region_packs"

    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    min_lat: Mapped[float] = mapped_column(Float, nullable=False)
    min_lon: Mapped[float] = mapped_column(Float, nullable=False)
    max_lat: Mapped[float] = mapped_column(Float, nullable=False)
    max_lon: Mapped[float] = mapped_column(Float, nullable=False)
    approx_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    version: Mapped[str] = mapped_column(String(32), nullable=False, default="1")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    files: Mapped[list[MapPackFileModel]] = relationship(
        "MapPackFileModel",
        back_populates="pack",
        lazy="selectin",
    )


class MapPackFileModel(UUIDBase):
    __tablename__ = "map_pack_files"

    pack_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("map_region_packs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    format: Mapped[str] = mapped_column(String(16), nullable=False)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    pack: Mapped[MapRegionPackModel] = relationship("MapRegionPackModel", back_populates="files")
