"""
Импорт OSM-мест по сетке bbox на всю РФ (Overpass → places).

Запуск (из backend/):
  poetry run python -m scripts.import_russia_osm
  poetry run python -m scripts.import_russia_osm --step 1.0 --delay 2
  poetry run python -m scripts.import_russia_osm --west 37 --east 38 --south 55 --north 56

Идемпотентно по osm_id. Может идти часами — можно останавливать и продолжать.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
from uuid import uuid4

from sqlalchemy import select

from domains.places.domain.entities import Place
from domains.places.infrastructure.models import PlaceModel
from domains.places.infrastructure.osm_sync import (
    RU_MAX_LAT,
    RU_MAX_LON,
    RU_MIN_LAT,
    RU_MIN_LON,
    element_to_place_row,
    fetch_overpass_elements,
)
from domains.users.infrastructure.models import UserModel  # noqa: F401
from infrastructure.postgres.session import session_maker

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("import_russia_osm")


def iter_cells(
    *,
    west: float,
    south: float,
    east: float,
    north: float,
    step: float,
):
    lat = south
    while lat < north:
        lon = west
        max_lat = min(lat + step, north)
        while lon < east:
            max_lon = min(lon + step, east)
            yield lon, lat, max_lon, max_lat
            lon += step
        lat += step


async def import_cell(min_lon: float, min_lat: float, max_lon: float, max_lat: float) -> int:
    elements = await fetch_overpass_elements(min_lon, min_lat, max_lon, max_lat, max_elements=4000)
    if not elements:
        return 0
    inserted = 0
    async with session_maker() as session:
        for el in elements:
            row = element_to_place_row(el)
            if row is None:
                continue
            exists = await session.execute(
                select(PlaceModel.id).where(PlaceModel.osm_id == row["osm_id"]),
            )
            if exists.scalar_one_or_none() is not None:
                continue
            place = Place.create_osm_place(
                id=uuid4(),
                osm_id=row["osm_id"],
                name=row["name"],
                place_type=row["place_type"],
                lat=row["lat"],
                lon=row["lon"],
                address_text=row["address_text"],
                metadata=row["metadata"],
            )
            session.add(
                PlaceModel(
                    id=place.id,
                    source=place.source,
                    osm_id=place.osm_id,
                    creator_id=None,
                    name=place.name,
                    place_type=place.place_type,
                    address_text=place.address_text,
                    lat=place.lat,
                    lon=place.lon,
                    is_public=True,
                    metadata_json=place.metadata,
                ),
            )
            inserted += 1
            if inserted % 200 == 0:
                await session.flush()
        await session.commit()
    return inserted


async def run(args: argparse.Namespace) -> None:
    cells = list(
        iter_cells(
            west=args.west,
            south=args.south,
            east=args.east,
            north=args.north,
            step=args.step,
        ),
    )
    logger.info("Ячеек: %s (step=%s)", len(cells), args.step)
    total = 0
    for i, (w, s, e, n) in enumerate(cells, 1):
        try:
            added = await import_cell(w, s, e, n)
            total += added
            logger.info("[%s/%s] bbox=%.2f,%.2f,%.2f,%.2f +%s (всего %s)", i, len(cells), w, s, e, n, added, total)
        except Exception as exc:  # noqa: BLE001
            logger.warning("[%s/%s] fail %s", i, len(cells), exc)
        await asyncio.sleep(args.delay)
    logger.info("Готово. Добавлено мест: %s", total)


def main() -> None:
    p = argparse.ArgumentParser(description="Импорт OSM мест по РФ")
    p.add_argument("--west", type=float, default=RU_MIN_LON)
    p.add_argument("--south", type=float, default=RU_MIN_LAT)
    p.add_argument("--east", type=float, default=RU_MAX_LON)
    p.add_argument("--north", type=float, default=RU_MAX_LAT)
    p.add_argument("--step", type=float, default=0.8, help="размер ячейки в градусах")
    p.add_argument("--delay", type=float, default=1.5, help="пауза между ячейками, сек")
    args = p.parse_args()
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
