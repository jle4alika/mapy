"""Доменные ошибки location."""

from __future__ import annotations

from common.exceptions.errors import AppError, NotFoundError, RateLimitExceededError, ValidationAppError

__all__ = [
    "AppError",
    "NotFoundError",
    "InvalidLocationError",
    "LocationThrottledError",
]


class InvalidLocationError(ValidationAppError):
    """Некорректные координаты или метрики."""

    def __init__(self, message: str = "Некорректная геолокация") -> None:
        super().__init__(message)


class LocationThrottledError(RateLimitExceededError):
    """Слишком частые обновления позиции."""

    def __init__(self, message: str = "Слишком частое обновление геолокации") -> None:
        super().__init__(message)
