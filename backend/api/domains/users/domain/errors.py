"""Доменные ошибки users."""

from __future__ import annotations

from common.exceptions.errors import AppError, ForbiddenError, NotFoundError, ValidationAppError

__all__ = [
    "AppError",
    "NotFoundError",
    "InvalidPasswordError",
    "InvalidUsernameError",
    "UserInactiveError",
]


class InvalidPasswordError(ValidationAppError):
    """Пароль не проходит доменные правила."""

    def __init__(self, message: str = "Некорректный пароль") -> None:
        super().__init__(message)


class InvalidUsernameError(ValidationAppError):
    """Username не проходит доменные правила."""

    def __init__(self, message: str = "Некорректное имя пользователя") -> None:
        super().__init__(message)


class UserInactiveError(ForbiddenError):
    """Операция недоступна для неактивного пользователя."""

    def __init__(self, message: str = "Пользователь деактивирован") -> None:
        super().__init__(message)
