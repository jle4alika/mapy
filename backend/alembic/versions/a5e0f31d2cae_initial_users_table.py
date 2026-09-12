"""
Начальная миграция: таблица users (fastapi-users + доменные поля).

Revision ID: a5e0f31d2cae
Revises:
Create Date: 2026-05-20 23:41:11.776554
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a5e0f31d2cae"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_SET_UPDATED_AT_FN = """
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

_USERS_UPDATED_AT_TRIGGER = """
DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE PROCEDURE set_updated_at();
"""


def upgrade() -> None:
    """Создание таблицы users и триггера updated_at."""

    op.execute(sa.text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))

    op.create_table(
        "users",
        sa.Column("username", sa.String(), nullable=False),
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("TIMEZONE('utc', now())"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("TIMEZONE('utc', now())"),
            nullable=False,
        ),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("hashed_password", sa.String(length=1024), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_superuser", sa.Boolean(), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    op.execute(sa.text(_SET_UPDATED_AT_FN))
    op.execute(sa.text("DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users"))
    op.execute(
        sa.text(
            """
            CREATE TRIGGER trg_users_set_updated_at
                BEFORE UPDATE ON users
                FOR EACH ROW
                EXECUTE PROCEDURE set_updated_at();
            """,
        ),
    )

def downgrade() -> None:
    """Удаление таблицы users и триггера updated_at."""

    op.execute(sa.text("DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users"))
    op.execute(sa.text("DROP FUNCTION IF EXISTS set_updated_at()"))
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
