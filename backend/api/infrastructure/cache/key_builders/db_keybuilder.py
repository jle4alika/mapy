"""Key builders для fastapi-cache2."""

from __future__ import annotations

import hashlib
from typing import Any, Callable, Optional, get_args
from uuid import UUID

from fastapi import Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

from infrastructure.dependencies.db import db_sessions

# Нестабильные Depends (новый инстанс на request) — не должны входить в ключ
_SKIP_TYPE_SUFFIXES = ("Service", "UnitOfWork", "Repository", "Manager")


def _is_excluded(value: object, exclude_type: object) -> bool:
    """Annotated[T, Depends(...)] нельзя передать в isinstance (Py 3.12+)."""

    inner = get_args(exclude_type)
    if inner and isinstance(value, inner[0]):
        return True
    try:
        return isinstance(value, (exclude_type,))
    except TypeError:
        return False


def _is_ephemeral_dependency(value: object) -> bool:
    """Service/UoW/repo — новый объект каждый request → ломает cache hit."""

    if isinstance(value, AsyncSession):
        return True
    return type(value).__name__.endswith(_SKIP_TYPE_SUFFIXES)


def _normalize(value: object) -> object | None:
    """Стабильное представление значения для ключа кэша."""

    if isinstance(value, AsyncSession) or _is_ephemeral_dependency(value):
        return None
    if isinstance(value, DeclarativeBase) and hasattr(value, "id"):
        return str(getattr(value, "id"))
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return None


def key_builder(
    func: Callable[..., Any],
    namespace: str,
    *,
    request: Optional[Request] = None,
    response: Optional[Response] = None,
    args: tuple[Any, ...] = (),
    kwargs: dict[str, Any] | None = None,
) -> str:
    """
    Ключ без сессии/service/UoW; ORM (User) — по id; UUID — как str.

    Path/query из request стабилизируют ключ между запросами.
    """

    kwargs = kwargs or {}
    exclude_types = (db_sessions, AsyncSession)
    cache_kw: dict[str, Any] = {}
    for name, value in kwargs.items():
        if any(_is_excluded(value, t) for t in exclude_types):
            continue
        if _is_ephemeral_dependency(value):
            continue
        normalized = _normalize(value)
        if normalized is None:
            continue
        cache_kw[name] = normalized

    cache_args = tuple(a for a in (_normalize(x) for x in args) if a is not None)

    path = request.url.path if request is not None else ""
    query = str(sorted(request.query_params.multi_items())) if request is not None else ""

    digest = hashlib.md5(  # noqa: S324
        f"{func.__module__}:{func.__name__}:{path}:{query}:{cache_args}:{cache_kw}".encode(),
    ).hexdigest()
    return f"{namespace}:{digest}"
