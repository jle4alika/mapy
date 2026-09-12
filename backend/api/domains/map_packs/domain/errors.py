"""Доменные ошибки map_packs."""

from __future__ import annotations

from common.exceptions.errors import AppError, NotFoundError

__all__ = ["AppError", "NotFoundError", "PackNotFoundError"]


class PackNotFoundError(NotFoundError):
    """Офлайн-пакет не найден."""

    def __init__(self, message: str = "Офлайн-пакет не найден") -> None:
        super().__init__(message)
