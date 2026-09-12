"""Порты map_packs."""

from __future__ import annotations

from abc import ABC, abstractmethod
from types import TracebackType
from typing import Self

from domains.map_packs.application.dto import MapRegionPackDTO
from domains.map_packs.domain.entities import MapRegionPack


class AbstractMapPacksRepository(ABC):
    @abstractmethod
    async def list_active(self) -> list[MapRegionPack]: ...

    @abstractmethod
    async def get_by_code(self, code: str) -> MapRegionPack | None: ...


class AbstractMapPacksUnitOfWork(ABC):
    packs: AbstractMapPacksRepository

    @abstractmethod
    async def __aenter__(self) -> Self: ...

    @abstractmethod
    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None: ...

    @abstractmethod
    async def commit(self) -> None: ...

    @abstractmethod
    async def rollback(self) -> None: ...


class AbstractMapPacksService(ABC):
    @abstractmethod
    async def list_packs(self) -> list[MapRegionPackDTO]: ...

    @abstractmethod
    async def get_pack(self, code: str) -> MapRegionPackDTO: ...
