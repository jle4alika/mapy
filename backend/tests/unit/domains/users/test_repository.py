from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from domains.users.infrastructure.repository import UserRepository
from tests.seeder import make_user_model


@pytest.mark.asyncio
async def test_get_by_id_maps_to_entity() -> None:
    model = make_user_model()
    session = MagicMock(spec=AsyncSession)
    session.get = AsyncMock(return_value=model)
    repo = UserRepository(session)

    found = await repo.get_by_id(model.id)

    session.get.assert_awaited_once()
    assert found is not None
    assert found.id == model.id
    assert found.username == model.username


@pytest.mark.asyncio
async def test_is_username_taken_true() -> None:
    session = MagicMock(spec=AsyncSession)
    result = MagicMock()
    result.scalar_one.return_value = 1
    session.execute = AsyncMock(return_value=result)
    repo = UserRepository(session)

    assert await repo.is_username_taken("alice") is True


@pytest.mark.asyncio
async def test_is_username_taken_false_with_exclude() -> None:
    session = MagicMock(spec=AsyncSession)
    result = MagicMock()
    result.scalar_one.return_value = 0
    session.execute = AsyncMock(return_value=result)
    repo = UserRepository(session)

    assert await repo.is_username_taken("alice", exclude_id=uuid4()) is False
