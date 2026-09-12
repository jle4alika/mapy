"""Фоновые задачи обслуживания Blink20."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine, text

from core.config import settings
from core.logging import get_logger
from infrastructure.celery_workers.celery_app import celery_app

logger = get_logger(__name__)


def _sync_url() -> str:
    """Синхронный URL для Celery-задач (asyncpg → psycopg/pg8000 не обязателен: через sqlalchemy+psycopg2 fallback)."""
    async_url = settings.db.url_asyncpg
    # используем postgresql:// для синхронного драйвера; если нет psycopg2 — задачи логируют ошибку
    return async_url.replace("postgresql+asyncpg://", "postgresql://", 1)


def _engine():
    return create_engine(_sync_url(), pool_pre_ping=True)


@celery_app.task(name="maintenance.expire_visibility_overrides")
def expire_visibility_overrides() -> int:
    """Сбрасывает истёкшие переопределения видимости в normal."""
    now = datetime.now(UTC).replace(tzinfo=None)
    sql = text(
        """
        UPDATE friend_visibility_overrides
        SET mode = 'normal',
            frozen_lat = NULL,
            frozen_lon = NULL,
            frozen_at = NULL,
            expires_at = NULL
        WHERE expires_at IS NOT NULL AND expires_at <= :now AND mode <> 'normal'
        """,
    )
    try:
        with _engine().begin() as conn:
            result = conn.execute(sql, {"now": now})
            count = result.rowcount or 0
        logger.info("expire_visibility_overrides count=%s", count)
        return int(count)
    except Exception:
        logger.exception("expire_visibility_overrides failed")
        return 0


@celery_app.task(name="maintenance.purge_location_history")
def purge_location_history(hours: int = 72) -> int:
    """Удаляет старую историю геолокации."""
    cutoff = datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=hours)
    sql = text("DELETE FROM location_history WHERE recorded_at < :cutoff")
    try:
        with _engine().begin() as conn:
            result = conn.execute(sql, {"cutoff": cutoff})
            count = result.rowcount or 0
        logger.info("purge_location_history count=%s", count)
        return int(count)
    except Exception:
        logger.exception("purge_location_history failed")
        return 0


@celery_app.task(name="maintenance.process_scheduled_deletions")
def process_scheduled_deletions() -> int:
    """Деактивирует аккаунты с наступившим scheduled_deletion_at."""
    now = datetime.now(UTC).replace(tzinfo=None)
    sql = text(
        """
        UPDATE users
        SET is_active = false
        WHERE scheduled_deletion_at IS NOT NULL
          AND scheduled_deletion_at <= :now
          AND is_active = true
        """,
    )
    try:
        with _engine().begin() as conn:
            result = conn.execute(sql, {"now": now})
            count = result.rowcount or 0
        logger.info("process_scheduled_deletions count=%s", count)
        return int(count)
    except Exception:
        logger.exception("process_scheduled_deletions failed")
        return 0
