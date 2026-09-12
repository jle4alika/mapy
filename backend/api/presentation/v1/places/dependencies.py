"""HTTP dependencies places."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from domains.places.application.ports import AbstractPlacesService, AbstractPlacesUnitOfWork
from domains.places.application.service import PlacesService
from domains.places.infrastructure.uow import PlacesUnitOfWork
from infrastructure.postgres.session import get_session


async def get_places_uow(
    session: AsyncSession = Depends(get_session),
) -> AsyncGenerator[AbstractPlacesUnitOfWork, None]:
    async with PlacesUnitOfWork(session) as uow:
        yield uow


async def get_places_service(
    uow: Annotated[AbstractPlacesUnitOfWork, Depends(get_places_uow)],
) -> AbstractPlacesService:
    return PlacesService(uow)


PlacesServiceDep = Annotated[AbstractPlacesService, Depends(get_places_service)]
