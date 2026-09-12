"""HTTP-обработчики исключений: единый JSON, тексты на русском."""

from __future__ import annotations

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DBAPIError, IntegrityError, OperationalError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from common.exceptions.errors import AppError, NotFoundError
from core.logging import get_logger

logger = get_logger(__name__)

_HTTP_STATUS_RU: dict[int, str] = {
    400: "Некорректный запрос",
    401: "Требуется вход в аккаунт",
    403: "Доступ запрещён",
    404: "Не найдено",
    405: "Метод не поддерживается",
    408: "Время ожидания запроса истекло",
    409: "Конфликт данных",
    413: "Слишком большой запрос",
    415: "Неподдерживаемый тип данных",
    422: "Ошибка проверки данных",
    429: "Слишком много запросов. Попробуйте позже.",
    500: "Внутренняя ошибка сервера. Пожалуйста, попробуйте позже.",
    502: "Ошибка шлюза",
    503: "Сервис временно недоступен. Попробуйте позже.",
    504: "Шлюз не ответил вовремя",
}


def _error_body(
    *,
    detail: str,
    code: str,
    errors: list[dict] | None = None,
) -> dict:
    body: dict = {"detail": detail, "code": code}
    if errors:
        body["errors"] = errors
    return body


def _translate_loc(loc: tuple | list) -> str:
    parts = [str(p) for p in loc if p not in {"body", "query", "path", "header"}]
    return ".".join(parts) if parts else "поле"


def _validation_msg(err: dict) -> str:
    """Краткое русское описание ошибки Pydantic."""
    typ = err.get("type", "")
    loc = _translate_loc(err.get("loc", ()))
    ctx = err.get("ctx") or {}

    if typ == "missing":
        return f"Поле «{loc}» обязательно"
    if typ in {"string_too_short", "too_short"}:
        m = ctx.get("min_length")
        return f"Поле «{loc}»: слишком короткое значение" + (f" (минимум {m})" if m else "")
    if typ in {"string_too_long", "too_long"}:
        m = ctx.get("max_length")
        return f"Поле «{loc}»: слишком длинное значение" + (f" (максимум {m})" if m else "")
    if typ in {"greater_than_equal", "greater_than"}:
        return f"Поле «{loc}»: значение меньше допустимого"
    if typ in {"less_than_equal", "less_than"}:
        return f"Поле «{loc}»: значение больше допустимого"
    if typ == "int_parsing":
        return f"Поле «{loc}»: ожидалось целое число"
    if typ == "float_parsing":
        return f"Поле «{loc}»: ожидалось число"
    if typ == "bool_parsing":
        return f"Поле «{loc}»: ожидалось логическое значение"
    if typ == "uuid_parsing":
        return f"Поле «{loc}»: некорректный идентификатор"
    if typ == "value_error":
        msg = err.get("msg") or "некорректное значение"
        # pydantic часто кладёт "Value error, <text>"
        if isinstance(msg, str) and msg.startswith("Value error, "):
            msg = msg.removeprefix("Value error, ")
        return f"Поле «{loc}»: {msg}"
    if typ == "enum":
        return f"Поле «{loc}»: недопустимое значение"
    if typ == "json_invalid":
        return "Тело запроса: некорректный JSON"

    raw = err.get("msg") or "некорректное значение"
    return f"Поле «{loc}»: {raw}"


async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(detail=str(exc) or "Не найдено", code=exc.code),
    )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=getattr(exc, "status_code", 400),
        content=_error_body(
            detail=str(exc) or "Ошибка приложения",
            code=getattr(exc, "code", "app_error"),
        ),
    )


async def request_validation_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    errors = []
    for err in exc.errors():
        errors.append(
            {
                "field": _translate_loc(err.get("loc", ())),
                "message": _validation_msg(err),
            },
        )
    detail = errors[0]["message"] if errors else "Ошибка проверки данных"
    return JSONResponse(
        status_code=422,
        content=_error_body(detail=detail, code="validation_error", errors=errors),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """fastapi-users / HTTPException → русский ответ."""
    status = exc.status_code
    default = _HTTP_STATUS_RU.get(status, "Ошибка запроса")
    detail = exc.detail
    if isinstance(detail, str):
        # Типичные английские фразы fastapi-users
        mapping = {
            "LOGIN_BAD_CREDENTIALS": "Неверный email или пароль",
            "LOGIN_USER_NOT_VERIFIED": "Подтвердите email перед входом",
            "REGISTER_USER_ALREADY_EXISTS": "Пользователь с таким email уже существует",
            "RESET_PASSWORD_BAD_TOKEN": "Недействительная ссылка сброса пароля",
            "VERIFY_USER_BAD_TOKEN": "Недействительная ссылка подтверждения",
            "VERIFY_USER_ALREADY_VERIFIED": "Email уже подтверждён",
            "UPDATE_USER_EMAIL_ALREADY_EXISTS": "Этот email уже занят",
            "Bad credentials": "Неверный email или пароль",
            "Unauthorized": "Требуется вход в аккаунт",
            "Not Found": "Не найдено",
            "Forbidden": "Доступ запрещён",
            "Too Many Requests. Превышен лимит запросов.": (
                "Слишком много запросов. Попробуйте позже."
            ),
            "Too Many Requests": "Слишком много запросов. Попробуйте позже.",
        }
        detail = mapping.get(detail, detail)
        # Если detail всё ещё на английском и короткий кодный — подставим default
        if detail.isupper() and "_" in detail:
            detail = mapping.get(detail, default)
    elif detail is None:
        detail = default
    else:
        detail = default

    code = {
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        422: "validation_error",
        429: "rate_limit",
    }.get(status, "http_error")

    return JSONResponse(
        status_code=status,
        content=_error_body(detail=str(detail), code=code),
    )


async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    logger.warning(
        "db_integrity_error",
        path=str(request.url.path),
        error=str(exc.orig) if getattr(exc, "orig", None) else str(exc),
    )
    return JSONResponse(
        status_code=409,
        content=_error_body(
            detail="Конфликт данных: запись уже существует или нарушает ограничения",
            code="conflict",
        ),
    )


async def operational_error_handler(
    request: Request,
    exc: OperationalError | DBAPIError,
) -> JSONResponse:
    logger.error(
        "db_operational_error",
        path=str(request.url.path),
        error=str(exc),
        exc_info=True,
    )
    return JSONResponse(
        status_code=503,
        content=_error_body(
            detail="База данных временно недоступна. Попробуйте позже.",
            code="service_unavailable",
        ),
    )


async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    logger.error(
        "db_error",
        path=str(request.url.path),
        error=str(exc),
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content=_error_body(
            detail="Внутренняя ошибка сервера. Пожалуйста, попробуйте позже.",
            code="internal_error",
        ),
    )


async def global_500_handler(request: Request, exc: Exception) -> JSONResponse:
    """Глобальный обработчик непредвиденных ошибок — всегда русский текст."""
    logger.error(
        "unhandled_error",
        path=str(request.url.path),
        error=str(exc),
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content=_error_body(
            detail="Внутренняя ошибка сервера. Пожалуйста, попробуйте позже.",
            code="internal_error",
        ),
    )
