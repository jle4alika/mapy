"""Unit of Work users."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from domains.users.application.ports import AbstractUserUnitOfWork
from domains.users.infrastructure.repository import UserRepository
from infrastructure.persistence.uow.base_sqlalchemy_uow import BaseUnitOfWork


class UserUnitOfWork(BaseUnitOfWork, AbstractUserUnitOfWork):
    users: UserRepository

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.users = UserRepository(session)

    def _uow_marker(self) -> None:
        return None
