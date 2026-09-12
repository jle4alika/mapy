"""Async SQLAlchemy engine (PostgreSQL / asyncpg) с пулом под нагрузку."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.pool import NullPool

from core.config import settings


def get_database_url() -> str:
    """URL БД для приложения (postgresql+asyncpg)."""

    if settings.db.TEST_URL:
        return settings.db.TEST_URL
    return settings.db.url_asyncpg


def get_direct_database_url() -> str:
    """Прямой URL (минуя PgBouncer) — для Alembic / DDL / Celery."""

    if settings.db.TEST_URL:
        return settings.db.TEST_URL
    return settings.db.url_asyncpg_direct


def _build_engine(*, null_pool: bool = False) -> AsyncEngine:
    connect_args: dict = {}
    engine_kwargs: dict = {
        "pool_pre_ping": True,  # отбраковка мёртвых соединений
        "echo": False,
    }

    if settings.db.USE_PGBOUNCER:
        # PgBouncer transaction mode: без prepared statements и без пула SQLAlchemy
        connect_args["statement_cache_size"] = 0
        engine_kwargs["poolclass"] = NullPool
        # pool_pre_ping с NullPool всё ещё полезен при checkout
    elif null_pool:
        engine_kwargs["poolclass"] = NullPool
    else:
        # Локальный / прямой Postgres — пул под нагрузку
        engine_kwargs.update(
            {
                "pool_size": settings.db.POOL_SIZE,
                "max_overflow": settings.db.MAX_OVERFLOW,
                "pool_timeout": settings.db.POOL_TIMEOUT,
                "pool_recycle": settings.db.POOL_RECYCLE,
            },
        )

    if connect_args:
        engine_kwargs["connect_args"] = connect_args

    return create_async_engine(get_database_url(), **engine_kwargs)


engine = _build_engine()
null_pool_engine = _build_engine(null_pool=True)


async def create_db_and_tables() -> None:
    """Создаёт таблицы по metadata (dev; в проде — Alembic)."""

    from sqlalchemy import text

    from infrastructure.postgres.base import Base

    async with engine.begin() as conn:
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.run_sync(Base.metadata.create_all)
