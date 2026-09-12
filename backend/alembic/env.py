"""
Окружение Alembic: async SQLAlchemy, metadata из infrastructure.postgres.
"""

from __future__ import annotations

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from infrastructure.postgres.base import Base
from infrastructure.postgres.engine import get_direct_database_url

# Импорт всех ORM-моделей в metadata
from domains.users.infrastructure.models import (  # noqa: F401
    UserDeviceModel,
    UserModel,
    UserNotificationSettingsModel,
    UserPrivacySettingsModel,
)
from domains.friends.infrastructure.models import (  # noqa: F401
    FriendRequestModel,
    FriendshipModel,
    FriendVisibilityOverrideModel,
    UserBlockModel,
)
from domains.location.infrastructure.models import (  # noqa: F401
    LocationHistoryModel,
    UserLocationModel,
)
from domains.places.infrastructure.models import (  # noqa: F401
    PlaceFavoriteModel,
    PlaceModel,
)
from domains.chats.infrastructure.models import (  # noqa: F401
    ChatMemberModel,
    ChatModel,
    DirectChatPairModel,
    MessageAttachmentModel,
    MessageModel,
    MessageReactionModel,
    PlaceChatModel,
)
from domains.map_packs.infrastructure.models import (  # noqa: F401
    MapPackFileModel,
    MapRegionPackModel,
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _configure_context(connection: Connection | None = None, *, url: str | None = None) -> None:
    """Общие параметры online/offline миграций."""

    kwargs = {
        "target_metadata": target_metadata,
        "compare_type": True,
        "compare_server_default": True,
    }
    if connection is not None:
        kwargs["connection"] = connection
    if url is not None:
        kwargs["url"] = url
        kwargs["literal_binds"] = True
        kwargs["dialect_opts"] = {"paramstyle": "named"}
    context.configure(**kwargs)


def run_migrations_offline() -> None:
    """Миграции без подключения к БД (SQL в stdout)."""

    _configure_context(url=get_direct_database_url())
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Синхронный callback для run_sync внутри async engine."""

    _configure_context(connection=connection)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Миграции через async engine (asyncpg)."""

    section = config.get_section(config.config_ini_section) or {}
    section["sqlalchemy.url"] = get_direct_database_url()

    connectable = async_engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Точка входа online-режима."""

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
