"""Мапперы friends."""

from __future__ import annotations

from domains.friends.application.dto import FriendRequestDTO, VisibilityOverrideDTO
from domains.friends.domain.entities import FriendRequest, FriendVisibilityOverride


class FriendsMapper:
    @classmethod
    def to_request(cls, entity: FriendRequest) -> FriendRequestDTO:
        return FriendRequestDTO(
            id=entity.id,
            from_user_id=entity.from_user_id,
            to_user_id=entity.to_user_id,
            status=entity.status,
            message=entity.message,
            created_at=entity.created_at,
        )

    @classmethod
    def to_visibility(cls, entity: FriendVisibilityOverride) -> VisibilityOverrideDTO:
        return VisibilityOverrideDTO(
            viewer_id=entity.viewer_id,
            mode=entity.mode,
            frozen_lat=entity.frozen_lat,
            frozen_lon=entity.frozen_lon,
            approximate_radius_m=entity.approximate_radius_m,
            expires_at=entity.expires_at,
        )
