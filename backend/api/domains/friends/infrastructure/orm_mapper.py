"""ORM ↔ domain friends."""

from __future__ import annotations

from domains.friends.domain.entities import (
    FriendRequest,
    Friendship,
    FriendVisibilityOverride,
    UserBlock,
)
from domains.friends.infrastructure.models import (
    FriendRequestModel,
    FriendshipModel,
    FriendVisibilityOverrideModel,
    UserBlockModel,
)


def request_to_entity(m: FriendRequestModel) -> FriendRequest:
    return FriendRequest(
        id=m.id,
        from_user_id=m.from_user_id,
        to_user_id=m.to_user_id,
        status=m.status,  # type: ignore[arg-type]
        message=m.message,
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


def friendship_to_entity(m: FriendshipModel) -> Friendship:
    return Friendship(
        id=m.id,
        user_low_id=m.user_low_id,
        user_high_id=m.user_high_id,
        since=m.since,
    )


def block_to_entity(m: UserBlockModel) -> UserBlock:
    return UserBlock(
        id=m.id,
        blocker_id=m.blocker_id,
        blocked_id=m.blocked_id,
        created_at=m.created_at,
    )


def visibility_to_entity(m: FriendVisibilityOverrideModel) -> FriendVisibilityOverride:
    return FriendVisibilityOverride(
        id=m.id,
        owner_id=m.owner_id,
        viewer_id=m.viewer_id,
        mode=m.mode,  # type: ignore[arg-type]
        frozen_lat=m.frozen_lat,
        frozen_lon=m.frozen_lon,
        frozen_at=m.frozen_at,
        approximate_radius_m=m.approximate_radius_m,
        expires_at=m.expires_at,
        created_at=m.created_at,
        updated_at=m.updated_at,
    )
