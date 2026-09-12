"""Unit of Work places."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from domains.places.application.ports import AbstractPlacesUnitOfWork
from domains.places.infrastructure.repository import PlacesRepository
from infrastructure.persistence.uow.base_sqlalchemy_uow import BaseUnitOfWork


class PlacesUnitOfWork(BaseUnitOfWork, AbstractPlacesUnitOfWork):
    places: PlacesRepository

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.places = PlacesRepository(session)

    def _uow_marker(self) -> None:
        return None
