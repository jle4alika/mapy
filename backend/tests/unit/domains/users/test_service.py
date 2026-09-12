from __future__ import annotations

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from domains.users.application.service import UserService
from domains.users.domain.errors import NotFoundError
from tests.seeder import make_user


@pytest.mark.asyncio
async def test_get_me_profile(user_service: UserService, sample_user, mock_uow) -> None:
    dto = await user_service.get_me_profile(sample_user.id)
    mock_uow.users.get_by_id.assert_awaited_with(sample_user.id)
    assert dto.username == sample_user.username
    assert dto.email == sample_user.email


@pytest.mark.asyncio
async def test_get_me_profile_not_found(mock_uow) -> None:
    mock_uow.users.get_by_id = AsyncMock(return_value=None)
    service = UserService(mock_uow)
    with pytest.raises(NotFoundError):
        await service.get_me_profile(uuid4())


@pytest.mark.asyncio
async def test_get_public_profile_ok(user_service: UserService, mock_uow, sample_user) -> None:
    dto = await user_service.get_public_profile(sample_user.id)
    mock_uow.users.get_by_id.assert_awaited_once_with(sample_user.id)
    assert dto.username == sample_user.username
    assert "email" not in dto.model_dump()


@pytest.mark.asyncio
async def test_get_public_profile_not_found(mock_uow) -> None:
    mock_uow.users.get_by_id = AsyncMock(return_value=None)
    service = UserService(mock_uow)
    with pytest.raises(NotFoundError):
        await service.get_public_profile(uuid4())


@pytest.mark.asyncio
async def test_get_public_profile_inactive(mock_uow) -> None:
    inactive = make_user(username="ghost", is_active=False)
    mock_uow.users.get_by_id = AsyncMock(return_value=inactive)
    service = UserService(mock_uow)
    with pytest.raises(NotFoundError):
        await service.get_public_profile(inactive.id)
