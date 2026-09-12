"""HTTP dependencies location."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from domains.friends.application.ports import AbstractFriendsUnitOfWork
from domains.friends.infrastructure.uow import FriendsUnitOfWork
from domains.location.application.ports import AbstractLocationService, AbstractLocationUnitOfWork
from domains.location.application.service import LocationService
from domains.location.infrastructure.uow import LocationUnitOfWork
from domains.location.infrastructure.ws_presence_publisher import WsPresencePublisher
from domains.users.application.ports import AbstractUserUnitOfWork
from domains.users.infrastructure.uow import UserUnitOfWork
from infrastructure.postgres.session import get_session

__all__ = ["LocationServiceDep", "get_location_service"]


async def get_location_uow(
    session: AsyncSession = Depends(get_session),
) -> AsyncGenerator[AbstractLocationUnitOfWork, None]:
    async with LocationUnitOfWork(session) as uow:
        yield uow


async def get_friends_uow_for_location(
    session: AsyncSession = Depends(get_session),
) -> AsyncGenerator[AbstractFriendsUnitOfWork, None]:
    async with FriendsUnitOfWork(session) as uow:
        yield uow


async def get_users_uow_for_location(
    session: AsyncSession = Depends(get_session),
) -> AsyncGenerator[AbstractUserUnitOfWork, None]:
    async with UserUnitOfWork(session) as uow:
        yield uow


async def get_location_service(
    uow: Annotated[AbstractLocationUnitOfWork, Depends(get_location_uow)],
    friends_uow: Annotated[AbstractFriendsUnitOfWork, Depends(get_friends_uow_for_location)],
    users_uow: Annotated[AbstractUserUnitOfWork, Depends(get_users_uow_for_location)],
) -> AbstractLocationService:
    return LocationService(uow, friends_uow, users_uow, presence=WsPresencePublisher())


LocationServiceDep = Annotated[AbstractLocationService, Depends(get_location_service)]
