"""ORM-миксины: UUID PK и timestamps с PostgreSQL-триггером updated_at."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Table, Uuid, event, text
from sqlalchemy.orm import Mapped, mapped_column

UTC_NOW = text("TIMEZONE('utc', now())")

_SET_UPDATED_AT_FN = """
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""


def _updated_at_trigger_sql(table_name: str) -> str:
    return f"""
    DROP TRIGGER IF EXISTS trg_{table_name}_set_updated_at ON {table_name};
    CREATE TRIGGER trg_{table_name}_set_updated_at
        BEFORE UPDATE ON {table_name}
        FOR EACH ROW
        EXECUTE PROCEDURE set_updated_at();
    """


class UUIDMixin:
    """Первичный ключ UUID (server-side gen_random_uuid)."""

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )


class CreatedUpdatedAtMixin:
    """created_at / updated_at; updated_at обновляется триггером PostgreSQL."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=UTC_NOW,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=UTC_NOW,
        nullable=False,
    )


class UUIDCreatedUpdatedAtMixin(UUIDMixin, CreatedUpdatedAtMixin):
    """Единый mixin: UUID PK + created_at / updated_at."""


@event.listens_for(Table, "after_create")
def _create_updated_at_trigger(target: Table, connection, **_kwargs) -> None:
    """После create_all вешает BEFORE UPDATE триггер на таблицы с updated_at."""

    if "updated_at" not in target.c:
        return
    connection.execute(text(_SET_UPDATED_AT_FN))
    # asyncpg не принимает несколько команд в одном prepared statement
    connection.execute(
        text(f"DROP TRIGGER IF EXISTS trg_{target.name}_set_updated_at ON {target.name}"),
    )
    connection.execute(
        text(
            f"""
            CREATE TRIGGER trg_{target.name}_set_updated_at
                BEFORE UPDATE ON {target.name}
                FOR EACH ROW
                EXECUTE PROCEDURE set_updated_at();
            """,
        ),
    )
