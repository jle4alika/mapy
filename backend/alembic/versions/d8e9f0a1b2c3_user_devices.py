"""user_devices — Expo push tokens

Revision ID: d8e9f0a1b2c3
Revises: c7d8e9f0a1b2
Create Date: 2026-09-12
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d8e9f0a1b2c3"
down_revision: Union[str, None] = "c7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_devices",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("expo_push_token", sa.String(length=255), nullable=False),
        sa.Column("platform", sa.String(length=16), nullable=False),
        sa.Column("device_id", sa.String(length=128), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=False),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=False),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("expo_push_token", name="uq_user_devices_expo_push_token"),
    )
    op.create_index("ix_user_devices_user_id", "user_devices", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_user_devices_user_id", table_name="user_devices")
    op.drop_table("user_devices")
