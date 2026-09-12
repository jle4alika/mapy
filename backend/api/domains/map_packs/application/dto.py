"""DTO map_packs."""

from __future__ import annotations

import uuid
from typing import Literal

from common.schemas.base import BaseDTO


class MapPackFileDTO(BaseDTO):
    url: str
    checksum_sha256: str
    format: Literal["mbtiles", "pmtiles"]
    size_bytes: int | None = None


class MapRegionPackDTO(BaseDTO):
    code: str
    title: str
    min_lat: float
    min_lon: float
    max_lat: float
    max_lon: float
    approx_size_bytes: int | None = None
    version: str
    is_active: bool = True
    files: list[MapPackFileDTO] = []
