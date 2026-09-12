"""HTTP dependencies chats."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from domains.chats.application.ports import AbstractChatsService, AbstractChatsUnitOfWork
from domains.chats.application.service import ChatsService
from domains.chats.infrastructure.uow import ChatsUnitOfWork
from domains.friends.application.ports import AbstractFriendsUnitOfWork
from domains.friends.infrastructure.uow import FriendsUnitOfWork
from domains.places.application.ports import AbstractPlacesUnitOfWork
from domains.places.infrastructure.uow import PlacesUnitOfWork
from infrastructure.postgres.session import get_session


async def get_chats_uow(
    session: AsyncSession = Depends(get_session),
) -> AsyncGenerator[AbstractChatsUnitOfWork, None]:
    async with ChatsUnitOfWork(session) as uow:
        yield uow


async def get_friends_uow_for_chats(
    session: AsyncSession = Depends(get_session),
) -> AsyncGenerator[AbstractFriendsUnitOfWork, None]:
    async with FriendsUnitOfWork(session) as uow:
        yield uow


async def get_places_uow_for_chats(
    session: AsyncSession = Depends(get_session),
) -> AsyncGenerator[AbstractPlacesUnitOfWork, None]:
    async with PlacesUnitOfWork(session) as uow:
        yield uow


async def get_chats_service(
    uow: Annotated[AbstractChatsUnitOfWork, Depends(get_chats_uow)],
    friends_uow: Annotated[AbstractFriendsUnitOfWork, Depends(get_friends_uow_for_chats)],
    places_uow: Annotated[AbstractPlacesUnitOfWork, Depends(get_places_uow_for_chats)],
) -> AbstractChatsService:
    return ChatsService(uow, friends_uow, places_uow)


ChatsServiceDep = Annotated[AbstractChatsService, Depends(get_chats_service)]
