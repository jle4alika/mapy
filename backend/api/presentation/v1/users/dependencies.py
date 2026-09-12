"""
HTTP dependencies для users (presentation).

Собирает application UoW/service; auth-зависимости — из infrastructure ACL.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from domains.users.application.ports import AbstractUserService, AbstractUserUnitOfWork
from domains.users.application.service import UserService
from domains.users.infrastructure.uow import UserUnitOfWork
from infrastructure.postgres.session import get_session

__all__ = [
    "get_user_uow",
    "get_user_service",
    "UserServiceDep",
]


async def get_user_uow(
    session: AsyncSession = Depends(get_session),
) -> AsyncGenerator[AbstractUserUnitOfWork, None]:
    async with UserUnitOfWork(session) as uow:
        yield uow


async def get_user_service(
    uow: Annotated[AbstractUserUnitOfWork, Depends(get_user_uow)],
) -> AbstractUserService:
    return UserService(uow)


UserServiceDep = Annotated[AbstractUserService, Depends(get_user_service)]
