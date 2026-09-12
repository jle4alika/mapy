"""Unit of Work chats."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from domains.chats.application.ports import AbstractChatsUnitOfWork
from domains.chats.infrastructure.repository import ChatsRepository
from infrastructure.persistence.uow.base_sqlalchemy_uow import BaseUnitOfWork


class ChatsUnitOfWork(BaseUnitOfWork, AbstractChatsUnitOfWork):
    chats: ChatsRepository

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)
        self.chats = ChatsRepository(session)

    def _uow_marker(self) -> None:
        return None
