"""
Схемы fastapi-users (anti-corruption).

Нужны библиотеке для register /users/me.
Доменные инварианты username — через User.validate_username.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi_users import schemas
from pydantic import Field, field_validator

from domains.users.domain.entities import User
from domains.users.domain.errors import InvalidUsernameError


def _username_for_pydantic(value: str | None) -> str | None:
    if value is None:
        return value
    try:
        User.validate_username(value)
    except InvalidUsernameError as exc:
        raise ValueError(str(exc)) from exc
    return value


class UserRead(schemas.BaseUser[uuid.UUID]):
    username: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class UserCreate(schemas.BaseUserCreate):
    username: str = Field(min_length=3, max_length=32)

    @field_validator("username")
    @classmethod
    def _validate_username(cls, value: str) -> str:
        return _username_for_pydantic(value)  # type: ignore[return-value]


class UserUpdate(schemas.BaseUserUpdate):
    username: str | None = Field(default=None, min_length=3, max_length=32)

    @field_validator("username")
    @classmethod
    def _validate_username(cls, value: str | None) -> str | None:
        return _username_for_pydantic(value)
