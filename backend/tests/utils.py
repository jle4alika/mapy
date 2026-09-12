"""Утилиты для тестов."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import TypeVar

T = TypeVar("T")


async def as_value(value: T) -> T:
    """AsyncMock-совместимый хелпер."""

    return value


def async_return(value: T) -> Callable[[], Awaitable[T]]:
    async def _inner() -> T:
        return value

    return _inner
