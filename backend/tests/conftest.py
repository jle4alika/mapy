"""Общие pytest-фикстуры."""

from __future__ import annotations

from collections.abc import AsyncGenerator, Iterator
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from httpx import ASGITransport, AsyncClient

from api.app import app as fastapi_app
from domains.users.application.ports import AbstractUserUnitOfWork
from domains.users.application.service import UserService
from domains.users.domain.entities import User
from domains.users.infrastructure.auth import current_active_user
from domains.users.infrastructure.models import UserModel


@pytest.fixture(autouse=True)
def _init_cache() -> Iterator[None]:
    FastAPICache.init(InMemoryBackend(), prefix="test-cache", enable=False)
    yield
    FastAPICache.reset()


@pytest.fixture
def sample_user() -> User:
    return User(
        id=uuid4(),
        email="alice@example.com",
        hashed_password="hashed",
        username="alice",
        is_active=True,
        is_superuser=False,
        is_verified=True,
        created_at=datetime(2024, 1, 1, tzinfo=UTC).replace(tzinfo=None),
        updated_at=datetime(2024, 1, 2, tzinfo=UTC).replace(tzinfo=None),
    )


@pytest.fixture
def sample_user_model(sample_user: User) -> UserModel:
    model = UserModel(
        id=sample_user.id,
        email=sample_user.email,
        hashed_password=sample_user.hashed_password,
        username=sample_user.username,
        is_active=sample_user.is_active,
        is_superuser=sample_user.is_superuser,
        is_verified=sample_user.is_verified,
    )
    model.created_at = sample_user.created_at
    model.updated_at = sample_user.updated_at
    return model


@pytest.fixture
def mock_uow(sample_user: User) -> MagicMock:
    uow = MagicMock(spec=AbstractUserUnitOfWork)
    uow.users = MagicMock()
    uow.users.get_by_id = AsyncMock(return_value=sample_user)
    uow.users.get_by_username = AsyncMock(return_value=sample_user)
    uow.users.is_username_taken = AsyncMock(return_value=False)
    uow.commit = AsyncMock()
    uow.rollback = AsyncMock()
    return uow


@pytest.fixture
def user_service(mock_uow: MagicMock) -> UserService:
    return UserService(mock_uow)


@pytest.fixture
def app(sample_user_model: UserModel) -> Iterator[FastAPI]:
    async def _override_current_user() -> UserModel:
        return sample_user_model

    fastapi_app.dependency_overrides[current_active_user] = _override_current_user
    yield fastapi_app
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    # raise_app_exceptions=False — как у реального клиента: 500 отдаётся JSON, не пробрасывается
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
