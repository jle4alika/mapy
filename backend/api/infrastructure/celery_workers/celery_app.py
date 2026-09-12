"""
Celery application: broker = RabbitMQ, result backend = Redis.

Запуск воркера (из корня репозитория):
  make celery-worker
  # или: poetry run celery -A infrastructure.celery_workers.celery_app:celery_app worker -l INFO -E

Beat (ежедневный OSM-синк):
  poetry run celery -A infrastructure.celery_workers.celery_app:celery_app beat -l INFO
"""

from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from core.config import settings


def _broker_url() -> str:
    return settings.celery.BROKER_URL or settings.rmq.celery_broker_url


def _result_backend() -> str:
    return settings.celery.RESULT_BACKEND or settings.redis.celery_result_url


celery_app = Celery("fastapi_architecture")

celery_app.conf.update(
    broker_url=_broker_url(),
    result_backend=_result_backend(),
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Moscow",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_default_queue=settings.celery.TASK_DEFAULT_QUEUE,
    task_always_eager=settings.celery.TASK_ALWAYS_EAGER,
    worker_concurrency=settings.celery.WORKER_CONCURRENCY,
    broker_connection_retry_on_startup=True,
    worker_send_task_events=True,
    task_send_sent_event=True,
    beat_schedule={
        "places-osm-daily": {
            "task": "places.sync_osm_daily",
            "schedule": crontab(hour=4, minute=15),
            "options": {"expires": 60 * 60 * 6},
        },
        "maintenance-expire-visibility": {
            "task": "maintenance.expire_visibility_overrides",
            "schedule": crontab(minute="*/15"),
        },
        "maintenance-purge-location": {
            "task": "maintenance.purge_location_history",
            "schedule": crontab(hour="*/6", minute=20),
        },
        "maintenance-scheduled-deletions": {
            "task": "maintenance.process_scheduled_deletions",
            "schedule": crontab(minute=5),
        },
    },
)

celery_app.conf.imports = (
    "infrastructure.celery_workers.tasks.example",
    "infrastructure.celery_workers.tasks.maintenance",
    "infrastructure.celery_workers.tasks.places_osm",
)
