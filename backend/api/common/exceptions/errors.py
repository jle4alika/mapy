"""Доменные/общие ошибки приложения (не HTTP).

Все тексты для клиента — на русском.
Обработчики в common.exceptions.base_handler мапят status_code → JSON.
"""

from __future__ import annotations


class AppError(Exception):
    """Базовая ошибка приложения (по умолчанию 400)."""

    status_code: int = 400
    code: str = "app_error"

    def __init__(self, message: str = "Ошибка приложения", *, code: str | None = None) -> None:
        super().__init__(message)
        if code is not None:
            self.code = code


class NotFoundError(AppError):
    """Сущность не найдена."""

    status_code = 404
    code = "not_found"

    def __init__(self, message: str = "Не найдено") -> None:
        super().__init__(message, code=self.code)


class ConflictError(AppError):
    """Конфликт состояния / уникальности."""

    status_code = 409
    code = "conflict"

    def __init__(self, message: str = "Конфликт данных") -> None:
        super().__init__(message, code=self.code)


class ForbiddenError(AppError):
    """Нет прав."""

    status_code = 403
    code = "forbidden"

    def __init__(self, message: str = "Доступ запрещён") -> None:
        super().__init__(message, code=self.code)


class UnauthorizedError(AppError):
    """Не авторизован."""

    status_code = 401
    code = "unauthorized"

    def __init__(self, message: str = "Требуется вход в аккаунт") -> None:
        super().__init__(message, code=self.code)


class ValidationAppError(AppError):
    """Ошибка валидации бизнес-правил."""

    status_code = 422
    code = "validation_error"

    def __init__(self, message: str = "Некорректные данные") -> None:
        super().__init__(message, code=self.code)


class RateLimitExceededError(AppError):
    """Превышен лимит запросов."""

    status_code = 429
    code = "rate_limit"

    def __init__(self, message: str = "Слишком много запросов. Попробуйте позже.") -> None:
        super().__init__(message, code=self.code)


class ServiceUnavailableError(AppError):
    """Внешний сервис или БД временно недоступны."""

    status_code = 503
    code = "service_unavailable"

    def __init__(self, message: str = "Сервис временно недоступен. Попробуйте позже.") -> None:
        super().__init__(message, code=self.code)
