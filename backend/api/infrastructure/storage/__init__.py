"""Локальное хранилище файлов."""

from infrastructure.storage.local import LocalObjectStorage, local_object_storage
from infrastructure.storage.ports import AbstractObjectStorage

__all__ = [
    "AbstractObjectStorage",
    "LocalObjectStorage",
    "local_object_storage",
]
