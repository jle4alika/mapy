"""Юнит-тесты домена friends."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from domains.friends.domain.entities import FriendRequest, FriendVisibilityOverride, ordered_pair
from domains.friends.domain.errors import CannotFriendSelfError, InvalidVisibilityError


def test_ordered_pair_stable() -> None:
    a, b = uuid4(), uuid4()
    assert ordered_pair(a, b) == ordered_pair(b, a)


def test_cannot_friend_self() -> None:
    uid = uuid4()
    with pytest.raises(CannotFriendSelfError):
        FriendRequest.create(id=uuid4(), from_user_id=uid, to_user_id=uid)


def test_visibility_max_24h() -> None:
    now = datetime.now(UTC).replace(tzinfo=None)
    ov = FriendVisibilityOverride(
        id=uuid4(),
        owner_id=uuid4(),
        viewer_id=uuid4(),
        mode="normal",
    )
    with pytest.raises(InvalidVisibilityError):
        ov.apply(
            mode="frozen",
            expires_at=now + timedelta(hours=48),
            now=now,
            frozen_lat=55.0,
            frozen_lon=37.0,
        )
