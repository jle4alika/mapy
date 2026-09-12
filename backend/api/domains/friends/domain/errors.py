"""Доменные ошибки friends."""

from __future__ import annotations

from common.exceptions.errors import AppError, ConflictError, ForbiddenError, NotFoundError, ValidationAppError

__all__ = [
    "AppError",
    "NotFoundError",
    "CannotFriendSelfError",
    "AlreadyFriendsError",
    "RequestNotFoundError",
    "RequestAlreadyPendingError",
    "FriendshipNotFoundError",
    "UserBlockedError",
    "InvalidVisibilityError",
]


class CannotFriendSelfError(ValidationAppError):
    """Нельзя добавить себя в друзья."""

    def __init__(self, message: str = "Нельзя добавить себя в друзья") -> None:
        super().__init__(message)


class AlreadyFriendsError(ConflictError):
    """Пользователи уже друзья."""

    def __init__(self, message: str = "Вы уже друзья") -> None:
        super().__init__(message)


class RequestNotFoundError(NotFoundError):
    """Заявка в друзья не найдена."""

    def __init__(self, message: str = "Заявка в друзья не найдена") -> None:
        super().__init__(message)


class RequestAlreadyPendingError(ConflictError):
    """Уже есть активная заявка."""

    def __init__(self, message: str = "Заявка уже отправлена") -> None:
        super().__init__(message)


class FriendshipNotFoundError(NotFoundError):
    """Дружба не найдена."""

    def __init__(self, message: str = "Дружба не найдена") -> None:
        super().__init__(message)


class UserBlockedError(ForbiddenError):
    """Операция запрещена из‑за блокировки."""

    def __init__(self, message: str = "Действие недоступно: пользователь в блокировке") -> None:
        super().__init__(message)


class InvalidVisibilityError(ValidationAppError):
    """Некорректные параметры видимости."""

    def __init__(self, message: str = "Некорректные параметры видимости") -> None:
        super().__init__(message)
