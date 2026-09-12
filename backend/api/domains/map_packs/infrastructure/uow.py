"""Unit of Work map_packs."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from domains.map_packs.application.ports import AbstractMapPacksUnitOfWork
from domains.map_packs.infrastructure.repository import MapPacksRepository
from infrastructure.persistence.uow.base_sqlalchemy_uow import BaseUnitOfWork


class MapPacksUnitOfWork(BaseUnitOfWork, AbstractMapPacksUnitOfWork):
    packs: MapPacksRepository

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.packs = MapPacksRepository(session)

    def _uow_marker(self) -> None:
        return None
