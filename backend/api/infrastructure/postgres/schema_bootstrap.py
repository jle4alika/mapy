"""
Инициализация схемы БД при старте приложения.

Предпочтительно: `make migrate` (Alembic). Опционально — флаги в .env.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from infrastructure.postgres.engine import create_db_and_tables
from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)

_BACKEND_ROOT = Path(__file__).resolve().parents[3]
_REPO_ROOT = _BACKEND_ROOT.parent


def _run_alembic_upgrade() -> None:
    """Синхронный запуск alembic upgrade head (из корня репозитория)."""

    cmd = [
        sys.executable,
        "-m",
        "alembic",
        "-c",
        str(_BACKEND_ROOT / "alembic.ini"),
        "upgrade",
        "head",
    ]
    subprocess.run(
        cmd,
        cwd=_REPO_ROOT,
        check=True,
        env={
            **os.environ,
            "PYTHONPATH": (
                f"{_REPO_ROOT}:{_BACKEND_ROOT / 'api'}" f":{os.environ.get('PYTHONPATH', '')}"
            ),
        },
    )


async def bootstrap_schema() -> None:
    """Применяет миграции или create_all согласно настройкам."""

    if settings.db.MIGRATE_ON_STARTUP:
        logger.info("Применение миграций Alembic (upgrade head)...")
        _run_alembic_upgrade()
        logger.info("Миграции Alembic применены")
        return

    if settings.db.CREATE_ALL_ON_STARTUP:
        await create_db_and_tables()
        logger.info("Схема БД создана через create_all (dev)")
        return

    logger.info("Схема БД не изменялась при старте (запустите: make migrate)")
