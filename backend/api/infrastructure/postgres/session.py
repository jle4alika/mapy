"""Async session makers и FastAPI-зависимость get_session."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from infrastructure.postgres.engine import engine, null_pool_engine

session_maker = async_sessionmaker(
    engine,
    expire_on_commit=False,
    autoflush=False,
)
null_pool_session_maker = async_sessionmaker(
    bind=null_pool_engine,
    expire_on_commit=False,
    autoflush=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Одна сессия на HTTP-запрос.

    При любой необработанной ошибке — rollback.
    Commit делает Unit of Work сервиса явно.
    """

    session = session_maker()
    try:
        yield session
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
