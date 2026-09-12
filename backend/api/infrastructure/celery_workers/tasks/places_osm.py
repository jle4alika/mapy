"""Фоновая синхронизация OSM-мест (ежедневно + по ячейкам)."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import create_engine, text

from core.config import settings
from core.logging import get_logger
from domains.places.infrastructure.osm_sync import (
    RU_MAX_LAT,
    RU_MAX_LON,
    RU_MIN_LAT,
    RU_MIN_LON,
    element_to_place_row,
    fetch_overpass_elements,
)
from infrastructure.celery_workers.celery_app import celery_app

logger = get_logger(__name__)

# Крупные города РФ — каждый день целиком
PRIORITY_CITIES: list[tuple[str, float, float, float, float]] = [
    ("moscow", 37.35, 55.55, 37.85, 55.95),
    ("spb", 30.05, 59.80, 30.55, 60.10),
    ("kazan", 48.95, 55.70, 49.30, 55.90),
    ("ekb", 60.45, 56.70, 60.80, 56.95),
    ("novosibirsk", 82.75, 54.90, 83.15, 55.15),
    ("nnov", 43.80, 56.20, 44.15, 56.40),
    ("samara", 50.00, 53.10, 50.35, 53.30),
    ("rostov", 39.55, 47.15, 39.85, 47.35),
    ("krasnodar", 38.90, 45.00, 39.15, 45.15),
    ("vladivostok", 131.80, 43.05, 132.00, 43.25),
]


def _sync_url() -> str:
    return settings.db.url_asyncpg.replace("postgresql+asyncpg://", "postgresql://", 1)


def _engine():
    return create_engine(_sync_url(), pool_pre_ping=True)


def _iter_grid(step: float = 1.0):
    lat = RU_MIN_LAT
    while lat < RU_MAX_LAT:
        lon = RU_MIN_LON
        max_lat = min(lat + step, RU_MAX_LAT)
        while lon < RU_MAX_LON:
            max_lon = min(lon + step, RU_MAX_LON)
            yield lon, lat, max_lon, max_lat
            lon += step
        lat += step


def _upsert_rows(conn, rows: list[dict]) -> tuple[int, int]:
    import json

    inserted = 0
    updated = 0
    for row in rows:
        osm_id = row["osm_id"]
        existing = conn.execute(
            text(
                "SELECT id, name, place_type, lat, lon, address_text FROM places WHERE osm_id = :oid",
            ),
            {"oid": osm_id},
        ).mappings().first()
        if existing is None:
            place_id = uuid4()
            conn.execute(
                text(
                    """
                    INSERT INTO places (id, source, osm_id, name, place_type, address_text, lat, lon, is_public, metadata, created_at, updated_at)
                    VALUES (:id, 'osm', :osm_id, :name, :place_type, :address_text, :lat, :lon, true, CAST(:metadata AS jsonb), NOW(), NOW())
                    """,
                ),
                {
                    "id": str(place_id),
                    "osm_id": osm_id,
                    "name": row["name"],
                    "place_type": row["place_type"],
                    "address_text": row["address_text"],
                    "lat": row["lat"],
                    "lon": row["lon"],
                    "metadata": json.dumps(row["metadata"] or {}, ensure_ascii=False),
                },
            )
            conn.execute(
                text(
                    "UPDATE places SET geom = "
                    "ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography WHERE id = :pid",
                ),
                {"lon": row["lon"], "lat": row["lat"], "pid": str(place_id)},
            )
            inserted += 1
            continue
        changed = (
            existing["name"] != row["name"]
            or existing["place_type"] != row["place_type"]
            or abs(float(existing["lat"]) - row["lat"]) > 1e-6
            or abs(float(existing["lon"]) - row["lon"]) > 1e-6
            or (row.get("address_text") and existing["address_text"] != row["address_text"])
        )
        if not changed:
            continue
        conn.execute(
            text(
                """
                UPDATE places
                SET name = :name,
                    place_type = :place_type,
                    address_text = COALESCE(:address_text, address_text),
                    lat = :lat,
                    lon = :lon,
                    geom = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                    updated_at = NOW()
                WHERE osm_id = :osm_id
                """,
            ),
            {
                "name": row["name"],
                "place_type": row["place_type"],
                "address_text": row["address_text"],
                "lat": row["lat"],
                "lon": row["lon"],
                "osm_id": osm_id,
            },
        )
        updated += 1
    return inserted, updated


async def _sync_bbox(min_lon: float, min_lat: float, max_lon: float, max_lat: float) -> tuple[int, int]:
    elements = await fetch_overpass_elements(min_lon, min_lat, max_lon, max_lat, max_elements=4000)
    rows = [r for r in (element_to_place_row(e) for e in elements) if r]
    if not rows:
        return 0, 0
    with _engine().begin() as conn:
        inserted, updated = _upsert_rows(conn, rows)
    return inserted, updated


def sync_bbox_sync(min_lon: float, min_lat: float, max_lon: float, max_lat: float) -> dict:
    inserted, updated = asyncio.run(_sync_bbox(min_lon, min_lat, max_lon, max_lat))
    return {"inserted": inserted, "updated": updated}


@celery_app.task(name="places.sync_osm_bbox")
def sync_osm_bbox(min_lon: float, min_lat: float, max_lon: float, max_lat: float) -> dict:
    """Синхронизация одной ячейки (можно дергать вручную)."""
    try:
        result = sync_bbox_sync(min_lon, min_lat, max_lon, max_lat)
        logger.info("sync_osm_bbox %s", result)
        return result
    except Exception:
        logger.exception("sync_osm_bbox failed")
        return {"inserted": 0, "updated": 0, "error": True}


@celery_app.task(name="places.sync_osm_daily")
def sync_osm_daily(grid_step: float = 1.0, grid_batch: int = 40) -> dict:
    """
    Ежедневный онлайн-синк:
    1) все priority-города;
    2) скользящее окно по сетке РФ (каждый день следующая пачка ячеек).
    """
    day_index = datetime.now(UTC).timetuple().tm_yday
    total_ins = 0
    total_upd = 0
    errors = 0

    for name, w, s, e, n in PRIORITY_CITIES:
        try:
            r = sync_bbox_sync(w, s, e, n)
            total_ins += r["inserted"]
            total_upd += r["updated"]
            logger.info("daily city %s +%s ~%s", name, r["inserted"], r["updated"])
        except Exception:
            errors += 1
            logger.exception("daily city failed %s", name)

    cells = list(_iter_grid(step=grid_step))
    if cells:
        start = (day_index * grid_batch) % len(cells)
        batch = [cells[(start + i) % len(cells)] for i in range(min(grid_batch, len(cells)))]
        for w, s, e, n in batch:
            try:
                r = sync_bbox_sync(w, s, e, n)
                total_ins += r["inserted"]
                total_upd += r["updated"]
            except Exception:
                errors += 1
                logger.exception("daily grid cell failed %s", (w, s, e, n))

    summary = {
        "inserted": total_ins,
        "updated": total_upd,
        "errors": errors,
        "day_index": day_index,
        "grid_batch": grid_batch,
    }
    logger.info("sync_osm_daily done %s", summary)
    return summary
