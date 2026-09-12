"""Доменные ошибки chats."""

from __future__ import annotations

from common.exceptions.errors import AppError, ForbiddenError, NotFoundError, ValidationAppError

__all__ = [
    "AppError",
    "NotFoundError",
    "ChatNotFoundError",
    "NotFriendsError",
    "InvalidMessageError",
    "NotChatMemberError",
]


class ChatNotFoundError(NotFoundError):
    """Чат не найден."""

    def __init__(self, message: str = "Чат не найден") -> None:
        super().__init__(message)


class NotFriendsError(ForbiddenError):
    """Личный чат только для друзей."""

    def __init__(self, message: str = "Личный чат доступен только друзьям") -> None:
        super().__init__(message)


class InvalidMessageError(ValidationAppError):
    """Некорректное сообщение."""

    def __init__(self, message: str = "Некорректное сообщение") -> None:
        super().__init__(message)


class NotChatMemberError(ForbiddenError):
    """Пользователь не участник чата."""

    def __init__(self, message: str = "Вы не участник этого чата") -> None:
        super().__init__(message)
