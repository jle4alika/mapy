"""Unit of Work location."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from domains.location.application.ports import AbstractLocationUnitOfWork
from domains.location.infrastructure.repository import LocationRepository
from infrastructure.persistence.uow.base_sqlalchemy_uow import BaseUnitOfWork


class LocationUnitOfWork(BaseUnitOfWork, AbstractLocationUnitOfWork):
    locations: LocationRepository

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.locations = LocationRepository(session)

    def _uow_marker(self) -> None:
        return None
