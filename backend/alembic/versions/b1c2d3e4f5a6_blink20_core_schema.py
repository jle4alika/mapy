"""
Blink20: PostGIS + расширение схемы (профиль, друзья, локации, места, чаты, пакеты).

Revision ID: b1c2d3e4f5a6
Revises: a5e0f31d2cae
Create Date: 2026-09-09 00:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography
from sqlalchemy.dialects import postgresql

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "a5e0f31d2cae"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_UTC_NOW = sa.text("TIMEZONE('utc', now())")
_UUID = postgresql.UUID(as_uuid=True)


def _apply_updated_at_trigger(table: str) -> None:
    op.execute(sa.text(f"DROP TRIGGER IF EXISTS trg_{table}_set_updated_at ON {table}"))
    op.execute(
        sa.text(
            f"""
            CREATE TRIGGER trg_{table}_set_updated_at
                BEFORE UPDATE ON {table}
                FOR EACH ROW
                EXECUTE PROCEDURE set_updated_at();
            """,
        ),
    )

def upgrade() -> None:
    op.execute(sa.text("CREATE EXTENSION IF NOT EXISTS postgis"))

    # --- users: поля профиля ---
    op.add_column("users", sa.Column("display_name", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.String(length=512), nullable=True))
    op.add_column("users", sa.Column("bio", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("status_text", sa.String(length=160), nullable=True))
    op.add_column("users", sa.Column("status_emoji", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("last_seen_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("scheduled_deletion_at", sa.DateTime(), nullable=True))
    op.create_index("ix_users_last_seen_at", "users", ["last_seen_at"])

    op.create_table(
        "user_privacy_settings",
        sa.Column("user_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("share_precise_location", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("share_battery", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("share_speed", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("discoverable_in_search", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "show_in_place_chats_as_nearby",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )

    op.create_table(
        "user_notification_settings",
        sa.Column("user_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("dm_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("friend_requests", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("place_chat_activity", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("friend_arrived", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("system", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )

    # --- friends ---
    op.create_table(
        "friend_requests",
        sa.Column("id", _UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("from_user_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("to_user_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("message", sa.Text(), nullable=True),
        sa.CheckConstraint("from_user_id <> to_user_id", name="ck_friend_requests_not_self"),
    )
    op.create_index("ix_friend_requests_from_user_id", "friend_requests", ["from_user_id"])
    op.create_index("ix_friend_requests_to_user_id", "friend_requests", ["to_user_id"])
    op.create_index("ix_friend_requests_status", "friend_requests", ["status"])
    op.execute(
        sa.text(
            "CREATE UNIQUE INDEX uq_friend_requests_pending "
            "ON friend_requests (from_user_id, to_user_id) WHERE status = 'pending'",
        ),
    )
    _apply_updated_at_trigger("friend_requests")

    op.create_table(
        "friendships",
        sa.Column("id", _UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("user_low_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_high_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("since", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.UniqueConstraint("user_low_id", "user_high_id", name="uq_friendships_pair"),
        sa.CheckConstraint("user_low_id <> user_high_id", name="ck_friendships_not_self"),
    )
    op.create_index("ix_friendships_user_low_id", "friendships", ["user_low_id"])
    op.create_index("ix_friendships_user_high_id", "friendships", ["user_high_id"])
    _apply_updated_at_trigger("friendships")

    op.create_table(
        "user_blocks",
        sa.Column("id", _UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("blocker_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("blocked_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("blocker_id", "blocked_id", name="uq_user_blocks_pair"),
        sa.CheckConstraint("blocker_id <> blocked_id", name="ck_user_blocks_not_self"),
    )
    op.create_index("ix_user_blocks_blocker_id", "user_blocks", ["blocker_id"])
    op.create_index("ix_user_blocks_blocked_id", "user_blocks", ["blocked_id"])
    _apply_updated_at_trigger("user_blocks")

    op.create_table(
        "friend_visibility_overrides",
        sa.Column("id", _UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("owner_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("viewer_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("mode", sa.String(length=32), nullable=False, server_default="normal"),
        sa.Column("frozen_lat", sa.Float(), nullable=True),
        sa.Column("frozen_lon", sa.Float(), nullable=True),
        sa.Column("frozen_at", sa.DateTime(), nullable=True),
        sa.Column("approximate_radius_m", sa.Integer(), nullable=False, server_default="500"),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("owner_id", "viewer_id", name="uq_visibility_owner_viewer"),
        sa.CheckConstraint("owner_id <> viewer_id", name="ck_visibility_not_self"),
    )
    op.create_index("ix_friend_visibility_overrides_owner_id", "friend_visibility_overrides", ["owner_id"])
    op.create_index("ix_friend_visibility_overrides_viewer_id", "friend_visibility_overrides", ["viewer_id"])
    op.create_index("ix_friend_visibility_overrides_expires_at", "friend_visibility_overrides", ["expires_at"])
    _apply_updated_at_trigger("friend_visibility_overrides")

    # --- locations ---
    op.create_table(
        "user_locations",
        sa.Column("user_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lon", sa.Float(), nullable=False),
        sa.Column("geom", Geography(geometry_type="POINT", srid=4326), nullable=True),
        sa.Column("accuracy_m", sa.Float(), nullable=True),
        sa.Column("speed_mps", sa.Float(), nullable=True),
        sa.Column("heading_deg", sa.Float(), nullable=True),
        sa.Column("battery_percent", sa.Integer(), nullable=True),
        sa.Column("is_moving", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("derived_status", sa.String(length=32), nullable=False, server_default="unknown"),
        sa.Column("recorded_at", sa.DateTime(), nullable=True),
        sa.Column("received_at", sa.DateTime(), nullable=True),
    )
    op.execute(sa.text("CREATE INDEX ix_user_locations_geom ON user_locations USING GIST (geom)"))
    op.create_index("ix_user_locations_recorded_at", "user_locations", ["recorded_at"])

    op.create_table(
        "location_history",
        sa.Column("id", _UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("user_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lon", sa.Float(), nullable=False),
        sa.Column("geom", Geography(geometry_type="POINT", srid=4326), nullable=True),
        sa.Column("accuracy_m", sa.Float(), nullable=True),
        sa.Column("speed_mps", sa.Float(), nullable=True),
        sa.Column("derived_status", sa.String(length=32), nullable=False, server_default="unknown"),
        sa.Column("recorded_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
    )
    op.create_index("ix_location_history_user_id", "location_history", ["user_id"])
    op.create_index("ix_location_history_recorded_at", "location_history", ["recorded_at"])
    op.execute(sa.text("CREATE INDEX ix_location_history_geom ON location_history USING GIST (geom)"))
    _apply_updated_at_trigger("location_history")

    # --- places ---
    op.create_table(
        "places",
        sa.Column("id", _UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("source", sa.String(length=16), nullable=False),
        sa.Column("osm_id", sa.String(length=64), nullable=True),
        sa.Column("creator_id", _UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("place_type", sa.String(length=64), nullable=False),
        sa.Column("address_text", sa.Text(), nullable=True),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lon", sa.Float(), nullable=False),
        sa.Column("geom", Geography(geometry_type="POINT", srid=4326), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.create_index("ix_places_source", "places", ["source"])
    op.create_index("ix_places_place_type", "places", ["place_type"])
    op.create_index("ix_places_creator_id", "places", ["creator_id"])
    op.create_index("ix_places_osm_id", "places", ["osm_id"], unique=True)
    op.execute(sa.text("CREATE INDEX ix_places_geom ON places USING GIST (geom)"))
    op.execute(sa.text("CREATE INDEX ix_places_metadata ON places USING GIN (metadata)"))
    op.execute(
        sa.text(
            "CREATE UNIQUE INDEX uq_places_home_per_user ON places (creator_id) "
            "WHERE place_type = 'home' AND creator_id IS NOT NULL",
        ),
    )
    _apply_updated_at_trigger("places")

    op.create_table(
        "place_favorites",
        sa.Column("user_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("place_id", _UUID, sa.ForeignKey("places.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.UniqueConstraint("user_id", "place_id", name="uq_place_favorites"),
    )

    # --- chats ---
    op.create_table(
        "chats",
        sa.Column("id", _UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("last_message_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_chats_kind", "chats", ["kind"])
    op.create_index("ix_chats_last_message_at", "chats", ["last_message_at"])
    _apply_updated_at_trigger("chats")

    op.create_table(
        "direct_chat_pairs",
        sa.Column("chat_id", _UUID, sa.ForeignKey("chats.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_low_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_high_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("user_low_id", "user_high_id", name="uq_direct_chat_pair"),
    )
    op.create_index("ix_direct_chat_pairs_user_low_id", "direct_chat_pairs", ["user_low_id"])
    op.create_index("ix_direct_chat_pairs_user_high_id", "direct_chat_pairs", ["user_high_id"])

    op.create_table(
        "place_chats",
        sa.Column("chat_id", _UUID, sa.ForeignKey("chats.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("place_id", _UUID, sa.ForeignKey("places.id", ondelete="CASCADE"), nullable=False, unique=True),
    )

    op.create_table(
        "chat_members",
        sa.Column("chat_id", _UUID, sa.ForeignKey("chats.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role", sa.String(length=16), nullable=False, server_default="member"),
        sa.Column("joined_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("last_read_message_id", _UUID, nullable=True),
        sa.Column("muted_until", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("chat_id", "user_id", name="uq_chat_members"),
    )

    op.create_table(
        "messages",
        sa.Column("id", _UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("chat_id", _UUID, sa.ForeignKey("chats.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("client_message_id", _UUID, nullable=True),
        sa.Column("reply_to_id", _UUID, sa.ForeignKey("messages.id", ondelete="SET NULL"), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_messages_chat_id", "messages", ["chat_id"])
    op.create_index("ix_messages_author_id", "messages", ["author_id"])
    op.execute(
        sa.text(
            "CREATE UNIQUE INDEX uq_messages_client_id ON messages (chat_id, author_id, client_message_id) "
            "WHERE client_message_id IS NOT NULL",
        ),
    )
    _apply_updated_at_trigger("messages")

    op.create_table(
        "message_attachments",
        sa.Column("id", _UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("message_id", _UUID, sa.ForeignKey("messages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("url", sa.String(length=1024), nullable=False),
        sa.Column("mime", sa.String(length=128), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
    )
    op.create_index("ix_message_attachments_message_id", "message_attachments", ["message_id"])
    _apply_updated_at_trigger("message_attachments")

    # --- map packs ---
    op.create_table(
        "map_region_packs",
        sa.Column("id", _UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("min_lat", sa.Float(), nullable=False),
        sa.Column("min_lon", sa.Float(), nullable=False),
        sa.Column("max_lat", sa.Float(), nullable=False),
        sa.Column("max_lon", sa.Float(), nullable=False),
        sa.Column("approx_size_bytes", sa.Integer(), nullable=True),
        sa.Column("version", sa.String(length=32), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_index("ix_map_region_packs_code", "map_region_packs", ["code"], unique=True)
    _apply_updated_at_trigger("map_region_packs")

    op.create_table(
        "map_pack_files",
        sa.Column("id", _UUID, server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=_UTC_NOW, nullable=False),
        sa.Column("pack_id", _UUID, sa.ForeignKey("map_region_packs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.String(length=1024), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.Column("format", sa.String(length=16), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
    )
    op.create_index("ix_map_pack_files_pack_id", "map_pack_files", ["pack_id"])
    _apply_updated_at_trigger("map_pack_files")


def downgrade() -> None:
    op.drop_table("map_pack_files")
    op.drop_table("map_region_packs")
    op.drop_table("message_attachments")
    op.drop_table("messages")
    op.drop_table("chat_members")
    op.drop_table("place_chats")
    op.drop_table("direct_chat_pairs")
    op.drop_table("chats")
    op.drop_table("place_favorites")
    op.drop_table("places")
    op.drop_table("location_history")
    op.drop_table("user_locations")
    op.drop_table("friend_visibility_overrides")
    op.drop_table("user_blocks")
    op.drop_table("friendships")
    op.drop_table("friend_requests")
    op.drop_table("user_notification_settings")
    op.drop_table("user_privacy_settings")
    op.drop_index("ix_users_last_seen_at", table_name="users")
    op.drop_column("users", "scheduled_deletion_at")
    op.drop_column("users", "last_seen_at")
    op.drop_column("users", "status_emoji")
    op.drop_column("users", "status_text")
    op.drop_column("users", "bio")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "display_name")
