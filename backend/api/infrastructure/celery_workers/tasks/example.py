"""Пример фоновых задач — шаблон для доменных task-модулей."""

from __future__ import annotations

from core.logging import get_logger
from infrastructure.celery_workers.celery_app import celery_app

logger = get_logger(__name__)


@celery_app.task(name="example.ping", bind=True)
def ping(self) -> str:
    """Проверка, что воркер жив: ping.delay() → 'pong'."""

    logger.info("celery.ping task_id=%s", self.request.id)
    return "pong"


@celery_app.task(name="example.add")
def add(x: int, y: int) -> int:
    """Простая CPU/IO-задача: add.delay(2, 3)."""

    return x + y
