"""Поведение доменной сущности User."""

from __future__ import annotations

import pytest

from domains.users.domain.entities import User
from domains.users.domain.errors import (
    InvalidPasswordError,
    InvalidUsernameError,
    UserInactiveError,
)
from tests.seeder import make_user


def test_validate_password_ok() -> None:
    User.validate_password("password123")


def test_validate_password_too_short() -> None:
    with pytest.raises(InvalidPasswordError):
        User.validate_password("short")


def test_rename() -> None:
    user = make_user(username="old_name")
    user.rename("new_name")
    assert user.username == "new_name"


def test_rename_invalid_username() -> None:
    user = make_user()
    with pytest.raises(InvalidUsernameError):
        user.rename("bad-name!")


def test_deactivate_blocks_mutations() -> None:
    user = make_user()
    user.deactivate()
    assert user.is_active is False
    assert user.is_superuser is False
    with pytest.raises(UserInactiveError):
        user.rename("other")


def test_verify_and_superuser() -> None:
    user = make_user(is_verified=False)
    user.mark_verified()
    user.grant_superuser()
    assert user.is_verified is True
    assert user.is_superuser is True
    user.revoke_superuser()
    assert user.is_superuser is False
