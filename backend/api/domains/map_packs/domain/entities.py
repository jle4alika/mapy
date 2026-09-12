"""Сущности офлайн-пакетов карты."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal
from uuid import UUID


@dataclass(slots=True, kw_only=True)
class MapPackFile:
    id: UUID
    pack_id: UUID
    url: str
    checksum_sha256: str
    format: Literal["mbtiles", "pmtiles"]
    size_bytes: int | None = None


@dataclass(slots=True, kw_only=True)
class MapRegionPack:
    id: UUID
    code: str
    title: str
    min_lat: float
    min_lon: float
    max_lat: float
    max_lon: float
    approx_size_bytes: int | None = None
    version: str = "1"
    is_active: bool = True
    files: list[MapPackFile] = field(default_factory=list)
    created_at: datetime | None = None
