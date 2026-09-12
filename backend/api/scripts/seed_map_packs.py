"""Сидер офлайн-пакетов карты (метаданные для манифеста)."""

from __future__ import annotations

import asyncio
from uuid import uuid4

from sqlalchemy import select

from domains.map_packs.infrastructure.models import MapPackFileModel, MapRegionPackModel
from domains.users.infrastructure.models import UserModel  # noqa: F401
from infrastructure.postgres.session import session_maker

SEED_PACKS = [
    {
        "code": "ru-msk",
        "title": "Москва",
        "min_lat": 55.5,
        "min_lon": 37.3,
        "max_lat": 55.9,
        "max_lon": 37.9,
        "approx_size_bytes": 180_000_000,
        "version": "2026.09.1",
        "files": [
            {
                "url": "https://example.invalid/packs/ru-msk-v1.mbtiles",
                "checksum_sha256": "0" * 64,
                "format": "mbtiles",
                "size_bytes": 180_000_000,
            },
        ],
    },
    {
        "code": "ru-spb",
        "title": "Санкт-Петербург",
        "min_lat": 59.7,
        "min_lon": 30.1,
        "max_lat": 60.1,
        "max_lon": 30.6,
        "approx_size_bytes": 120_000_000,
        "version": "2026.09.1",
        "files": [
            {
                "url": "https://example.invalid/packs/ru-spb-v1.mbtiles",
                "checksum_sha256": "1" * 64,
                "format": "mbtiles",
                "size_bytes": 120_000_000,
            },
        ],
    },
]


async def seed_map_packs() -> int:
    inserted = 0
    async with session_maker() as session:
        for pack in SEED_PACKS:
            existing = await session.execute(
                select(MapRegionPackModel).where(MapRegionPackModel.code == pack["code"]),
            )
            if existing.scalars().one_or_none() is not None:
                continue
            pack_id = uuid4()
            session.add(
                MapRegionPackModel(
                    id=pack_id,
                    code=pack["code"],
                    title=pack["title"],
                    min_lat=pack["min_lat"],
                    min_lon=pack["min_lon"],
                    max_lat=pack["max_lat"],
                    max_lon=pack["max_lon"],
                    approx_size_bytes=pack["approx_size_bytes"],
                    version=pack["version"],
                    is_active=True,
                ),
            )
            for f in pack["files"]:
                session.add(
                    MapPackFileModel(
                        id=uuid4(),
                        pack_id=pack_id,
                        url=f["url"],
                        checksum_sha256=f["checksum_sha256"],
                        format=f["format"],
                        size_bytes=f["size_bytes"],
                    ),
                )
            inserted += 1
        await session.commit()
    return inserted


async def main() -> None:
    count = await seed_map_packs()
    print(f"Загружено пакетов: {count}")


if __name__ == "__main__":
    asyncio.run(main())
