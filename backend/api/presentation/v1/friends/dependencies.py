"""HTTP dependencies friends."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from domains.friends.application.ports import AbstractFriendsService, AbstractFriendsUnitOfWork
from domains.friends.application.service import FriendsService
from domains.friends.infrastructure.uow import FriendsUnitOfWork
from domains.users.application.ports import AbstractUserUnitOfWork
from domains.users.infrastructure.uow import UserUnitOfWork
from infrastructure.postgres.session import get_session

__all__ = ["FriendsServiceDep", "get_friends_service"]


async def get_friends_uow(
    session: AsyncSession = Depends(get_session),
) -> AsyncGenerator[AbstractFriendsUnitOfWork, None]:
    async with FriendsUnitOfWork(session) as uow:
        yield uow


async def get_users_uow_for_friends(
    session: AsyncSession = Depends(get_session),
) -> AsyncGenerator[AbstractUserUnitOfWork, None]:
    async with UserUnitOfWork(session) as uow:
        yield uow


async def get_friends_service(
    uow: Annotated[AbstractFriendsUnitOfWork, Depends(get_friends_uow)],
    users_uow: Annotated[AbstractUserUnitOfWork, Depends(get_users_uow_for_friends)],
) -> AbstractFriendsService:
    return FriendsService(uow, users_uow)


FriendsServiceDep = Annotated[AbstractFriendsService, Depends(get_friends_service)]
