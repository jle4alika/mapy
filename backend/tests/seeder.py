"""Фабрики тестовых данных."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from polyfactory.factories.pydantic_factory import ModelFactory

from domains.users.application.dto import UserPublicDTO
from domains.users.domain.entities import User
from domains.users.infrastructure.models import UserModel


class UserPublicDTOFactory(ModelFactory[UserPublicDTO]):
    __model__ = UserPublicDTO


def make_user(
    *,
    username: str = "user",
    email: str | None = None,
    is_active: bool = True,
    is_superuser: bool = False,
    is_verified: bool = True,
) -> User:
    now = datetime.now(UTC).replace(tzinfo=None)
    return User(
        id=uuid4(),
        email=email or f"{username}@example.com",
        hashed_password="hashed",
        username=username,
        is_active=is_active,
        is_superuser=is_superuser,
        is_verified=is_verified,
        display_name=None,
        avatar_url=None,
        bio=None,
        status_text=None,
        status_emoji=None,
        last_seen_at=None,
        scheduled_deletion_at=None,
        created_at=now,
        updated_at=now,
    )


def make_user_model(
    *,
    username: str = "user",
    email: str | None = None,
    is_active: bool = True,
    is_superuser: bool = False,
    is_verified: bool = True,
) -> UserModel:
    user = UserModel(
        id=uuid4(),
        email=email or f"{username}@example.com",
        hashed_password="hashed",
        username=username,
        is_active=is_active,
        is_superuser=is_superuser,
        is_verified=is_verified,
    )
    now = datetime.now(UTC).replace(tzinfo=None)
    user.created_at = now
    user.updated_at = now
    return user
