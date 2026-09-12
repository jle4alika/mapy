from abc import ABC, abstractmethod
from types import TracebackType
from typing import Self

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from common.exceptions.errors import ConflictError, ServiceUnavailableError
from core.logging import get_logger

logger = get_logger(__name__)


class BaseUnitOfWork(ABC):
    """
    Unit of Work над AsyncSession.

    Жизненный цикл сессии снаружи (FastAPI Depends / тесты).
    UoW только commit/rollback; сессию не закрывает.
    При исключении в контексте — rollback.
    """

    _session: AsyncSession

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        if exc_type is not None:
            try:
                await self._session.rollback()
            except Exception:
                logger.exception("uow_rollback_failed")

    async def commit(self) -> None:
        try:
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            logger.warning("uow_integrity_error", error=str(exc.orig) if exc.orig else str(exc))
            raise ConflictError(
                "Конфликт данных: запись уже существует или нарушает ограничения",
            ) from exc
        except SQLAlchemyError as exc:
            await self._session.rollback()
            logger.error("uow_commit_failed", error=str(exc), exc_info=True)
            raise ServiceUnavailableError(
                "Не удалось сохранить данные. Попробуйте позже.",
            ) from exc

    async def rollback(self) -> None:
        await self._session.rollback()

    @property
    def session(self) -> AsyncSession:
        return self._session

    @abstractmethod
    def _uow_marker(self) -> None:
        """Маркер: запрещает инстанцировать базовый класс."""
