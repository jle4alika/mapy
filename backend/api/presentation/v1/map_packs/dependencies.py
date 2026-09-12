"""HTTP dependencies map_packs."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from domains.map_packs.application.ports import AbstractMapPacksService, AbstractMapPacksUnitOfWork
from domains.map_packs.application.service import MapPacksService
from domains.map_packs.infrastructure.uow import MapPacksUnitOfWork
from infrastructure.postgres.session import get_session


async def get_map_packs_uow(
    session: AsyncSession = Depends(get_session),
) -> AsyncGenerator[AbstractMapPacksUnitOfWork, None]:
    async with MapPacksUnitOfWork(session) as uow:
        yield uow


async def get_map_packs_service(
    uow: Annotated[AbstractMapPacksUnitOfWork, Depends(get_map_packs_uow)],
) -> AbstractMapPacksService:
    return MapPacksService(uow)


MapPacksServiceDep = Annotated[AbstractMapPacksService, Depends(get_map_packs_service)]
