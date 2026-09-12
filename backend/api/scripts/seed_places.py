"""
Сидер демо-мест (заправки/кафе в Москве) из GeoJSON.

Запуск:
  poetry run python -m scripts.seed_places
  # или: make seed-places
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from domains.places.infrastructure.models import PlaceModel
from domains.users.infrastructure.models import UserModel  # noqa: F401 — FK metadata
from infrastructure.postgres.session import session_maker

DEMO_GEOJSON = Path(__file__).resolve().parent / "data" / "moscow_demo_places.geojson"


async def seed_places(session: AsyncSession) -> int:
    if not DEMO_GEOJSON.is_file():
        raise FileNotFoundError(f"Нет файла {DEMO_GEOJSON}")
    data = json.loads(DEMO_GEOJSON.read_text(encoding="utf-8"))
    inserted = 0
    for feature in data.get("features", []):
        props = feature.get("properties") or {}
        coords = (feature.get("geometry") or {}).get("coordinates") or []
        if len(coords) < 2:
            continue
        lon, lat = float(coords[0]), float(coords[1])
        osm_id = props.get("osm_id")
        if osm_id:
            existing = await session.execute(
                select(PlaceModel).where(PlaceModel.osm_id == str(osm_id)),
            )
            if existing.scalars().one_or_none() is not None:
                continue
        place_id = uuid4()
        model = PlaceModel(
            id=place_id,
            source="osm" if osm_id else "user",
            osm_id=str(osm_id) if osm_id else None,
            name=props.get("name") or "Без названия",
            place_type=props.get("place_type") or "custom",
            address_text=props.get("address"),
            lat=lat,
            lon=lon,
            is_public=True,
            metadata_json={k: v for k, v in props.items() if k not in {"name", "place_type", "address"}},
        )
        session.add(model)
        await session.flush()
        await session.execute(
            text(
                "UPDATE places SET geom = "
                "ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography WHERE id = :pid",
            ),
            {"lon": lon, "lat": lat, "pid": place_id},
        )
        inserted += 1
    await session.commit()
    return inserted


async def main() -> None:
    async with session_maker() as session:
        count = await seed_places(session)
    print(f"Загружено мест: {count}")


if __name__ == "__main__":
    asyncio.run(main())
