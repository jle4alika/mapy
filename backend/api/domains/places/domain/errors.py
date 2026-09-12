"""Доменные ошибки places."""

from __future__ import annotations

from common.exceptions.errors import AppError, NotFoundError, ValidationAppError

__all__ = ["AppError", "NotFoundError", "InvalidPlaceError", "PlaceNotFoundError"]


class InvalidPlaceError(ValidationAppError):
    """Некорректные данные места."""

    def __init__(self, message: str = "Некорректные данные места") -> None:
        super().__init__(message)


class PlaceNotFoundError(NotFoundError):
    """Место не найдено."""

    def __init__(self, message: str = "Место не найдено") -> None:
        super().__init__(message)
