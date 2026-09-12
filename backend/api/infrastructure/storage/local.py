"""Локальное файловое хранилище под STORAGE_ROOT."""

from __future__ import annotations

import asyncio
from pathlib import Path

from core.config import settings
from infrastructure.storage.ports import AbstractObjectStorage


class LocalObjectStorage(AbstractObjectStorage):
    def __init__(
        self,
        root: str | Path | None = None,
        public_base_url: str | None = None,
    ) -> None:
        self._root = Path(root or settings.storage.ROOT).resolve()
        self._public_base = (public_base_url or settings.storage.PUBLIC_BASE_URL).rstrip("/")
        self._root.mkdir(parents=True, exist_ok=True)

    def resolve_path(self, key: str) -> Path:
        safe = key.lstrip("/").replace("..", "")
        path = (self._root / safe).resolve()
        if not str(path).startswith(str(self._root)):
            raise ValueError("Недопустимый ключ хранилища")
        return path

    async def save(self, *, key: str, data: bytes, content_type: str | None = None) -> str:
        path = self.resolve_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)

        def _write() -> None:
            path.write_bytes(data)

        await asyncio.to_thread(_write)
        return f"{self._public_base}/{key.lstrip('/')}"

    async def delete(self, *, key: str) -> None:
        path = self.resolve_path(key)

        def _unlink() -> None:
            if path.is_file():
                path.unlink()

        await asyncio.to_thread(_unlink)


local_object_storage = LocalObjectStorage()
