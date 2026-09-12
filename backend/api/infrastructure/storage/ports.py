"""Порт объектного хранилища файлов."""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path


class AbstractObjectStorage(ABC):
    @abstractmethod
    async def save(self, *, key: str, data: bytes, content_type: str | None = None) -> str:
        """Сохранить объект, вернуть публичный URL или путь."""

    @abstractmethod
    async def delete(self, *, key: str) -> None:
        """Удалить объект по ключу."""

    @abstractmethod
    def resolve_path(self, key: str) -> Path:
        """Локальный путь (для LocalObjectStorage)."""
