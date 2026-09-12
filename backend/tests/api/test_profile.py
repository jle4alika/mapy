"""API-тесты profile (v1)."""

from __future__ import annotations

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import AsyncClient

from presentation.v1.users.dependencies import get_user_service
from domains.users.application.mappers import UserMapper
from domains.users.application.ports import AbstractUserService
from domains.users.domain.errors import NotFoundError
from tests.seeder import make_user


@pytest.mark.asyncio
async def test_health(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_profile_me(client: AsyncClient, app: FastAPI, sample_user) -> None:
    service = AsyncMock(spec=AbstractUserService)
    service.get_me_profile = AsyncMock(return_value=UserMapper.to_me(sample_user))
    app.dependency_overrides[get_user_service] = lambda: service

    response = await client.get("/api/v1/profile/me")
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == sample_user.username
    assert body["email"] == sample_user.email
    service.get_me_profile.assert_awaited_once_with(sample_user.id)


@pytest.mark.asyncio
async def test_profile_public_ok(client: AsyncClient, app: FastAPI) -> None:
    user = make_user(username="pub")
    service = AsyncMock(spec=AbstractUserService)
    service.get_public_profile = AsyncMock(return_value=UserMapper.to_public(user))
    app.dependency_overrides[get_user_service] = lambda: service

    response = await client.get(f"/api/v1/profile/{user.id}")
    assert response.status_code == 200
    assert response.json()["username"] == "pub"


@pytest.mark.asyncio
async def test_profile_public_404(client: AsyncClient, app: FastAPI) -> None:
    service = AsyncMock(spec=AbstractUserService)
    service.get_public_profile = AsyncMock(side_effect=NotFoundError("User not found"))
    app.dependency_overrides[get_user_service] = lambda: service

    response = await client.get(f"/api/v1/profile/{uuid4()}")
    assert response.status_code == 404
