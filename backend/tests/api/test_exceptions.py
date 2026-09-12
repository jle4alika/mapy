"""Тесты обработчиков ошибок и пула."""

from __future__ import annotations

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from httpx import AsyncClient

from common.exceptions.errors import AppError, ConflictError, ForbiddenError
from core.config import settings
from domains.users.application.ports import AbstractUserService
from domains.users.domain.errors import NotFoundError
from presentation.v1.users.dependencies import get_user_service


@pytest.mark.asyncio
async def test_not_found_russian_with_code(client: AsyncClient, app) -> None:
    service = AsyncMock(spec=AbstractUserService)
    service.get_public_profile = AsyncMock(side_effect=NotFoundError("Пользователь не найден"))
    app.dependency_overrides[get_user_service] = lambda: service

    response = await client.get(f"/api/v1/profile/{uuid4()}")
    assert response.status_code == 404
    body = response.json()
    assert body["detail"] == "Пользователь не найден"
    assert body["code"] == "not_found"


@pytest.mark.asyncio
async def test_app_error_forbidden(client: AsyncClient, app) -> None:
    service = AsyncMock(spec=AbstractUserService)
    service.get_public_profile = AsyncMock(side_effect=ForbiddenError("Доступ запрещён"))
    app.dependency_overrides[get_user_service] = lambda: service

    response = await client.get(f"/api/v1/profile/{uuid4()}")
    assert response.status_code == 403
    assert response.json()["code"] == "forbidden"


@pytest.mark.asyncio
async def test_conflict_error(client: AsyncClient, app) -> None:
    service = AsyncMock(spec=AbstractUserService)
    service.get_public_profile = AsyncMock(side_effect=ConflictError("Конфликт"))
    app.dependency_overrides[get_user_service] = lambda: service

    response = await client.get(f"/api/v1/profile/{uuid4()}")
    assert response.status_code == 409
    assert response.json()["detail"] == "Конфликт"


@pytest.mark.asyncio
async def test_validation_error_russian(client: AsyncClient) -> None:
    # register без обязательных полей
    response = await client.post("/api/v1/auth/register", json={})
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_error"
    assert "detail" in body
    assert isinstance(body.get("errors"), list)
    assert body["errors"]


@pytest.mark.asyncio
async def test_unhandled_500_russian(client: AsyncClient, app) -> None:
    service = AsyncMock(spec=AbstractUserService)
    service.get_public_profile = AsyncMock(side_effect=RuntimeError("boom"))
    app.dependency_overrides[get_user_service] = lambda: service

    response = await client.get(f"/api/v1/profile/{uuid4()}")
    assert response.status_code == 500
    body = response.json()
    assert body["code"] == "internal_error"
    assert "Внутренняя ошибка" in body["detail"]
    assert "boom" not in body["detail"]


def test_pool_settings_present() -> None:
    assert settings.db.POOL_SIZE >= 1
    assert settings.db.MAX_OVERFLOW >= 0
    assert settings.db.POOL_TIMEOUT >= 1
    assert settings.db.POOL_RECYCLE >= 60


def test_app_error_default_russian() -> None:
    err = AppError()
    assert str(err) == "Ошибка приложения"
    assert err.status_code == 400
