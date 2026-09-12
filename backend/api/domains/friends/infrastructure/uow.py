"""Unit of Work friends."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from domains.friends.application.ports import AbstractFriendsUnitOfWork
from domains.friends.infrastructure.repository import FriendsRepository
from infrastructure.persistence.uow.base_sqlalchemy_uow import BaseUnitOfWork


class FriendsUnitOfWork(BaseUnitOfWork, AbstractFriendsUnitOfWork):
    friends: FriendsRepository

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.friends = FriendsRepository(session)

    def _uow_marker(self) -> None:
        return None
