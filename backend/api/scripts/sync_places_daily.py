"""
Ручной/cron запуск ежедневного OSM-синка без Celery Beat.

  PYTHONPATH=api poetry run python -m scripts.sync_places_daily
"""

from __future__ import annotations

from infrastructure.celery_workers.tasks.places_osm import sync_osm_daily


def main() -> None:
    summary = sync_osm_daily()
    print(summary)


if __name__ == "__main__":
    main()
