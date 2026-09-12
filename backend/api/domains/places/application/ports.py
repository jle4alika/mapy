"""Порты places."""

from __future__ import annotations

from abc import ABC, abstractmethod
from types import TracebackType
from typing import Any, Self
from uuid import UUID

from domains.places.application.dto import PlaceDTO, PlaceFavoriteDTO
from domains.places.domain.entities import Place, PlaceFavorite


class AbstractPlacesRepository(ABC):
    @abstractmethod
    async def get(self, place_id: UUID) -> Place | None: ...

    @abstractmethod
    async def get_by_osm_id(self, osm_id: str) -> Place | None: ...

    @abstractmethod
    async def add(self, place: Place) -> Place: ...

    @abstractmethod
    async def update_name(self, place_id: UUID, name: str) -> None: ...

    @abstractmethod
    async def list_in_bbox(
        self,
        *,
        min_lon: float,
        min_lat: float,
        max_lon: float,
        max_lat: float,
        place_types: list[str] | None = None,
        limit: int = 5000,
    ) -> list[Place]: ...

    @abstractmethod
    async def add_favorite(self, fav: PlaceFavorite) -> PlaceFavorite: ...

    @abstractmethod
    async def remove_favorite(self, user_id: UUID, place_id: UUID) -> None: ...

    @abstractmethod
    async def list_favorites(self, user_id: UUID) -> list[PlaceFavorite]: ...

    @abstractmethod
    async def get_place_chat_id(self, place_id: UUID) -> UUID | None: ...


class AbstractPlacesUnitOfWork(ABC):
    places: AbstractPlacesRepository

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


class AbstractPlacesService(ABC):
    @abstractmethod
    async def create_user_place(
        self,
        creator_id: UUID,
        *,
        name: str,
        place_type: str,
        lat: float,
        lon: float,
        address_text: str | None = None,
        is_public: bool = True,
        metadata: dict[str, Any] | None = None,
    ) -> PlaceDTO: ...

    @abstractmethod
    async def get_place(self, place_id: UUID) -> PlaceDTO: ...

    @abstractmethod
    async def list_bbox(
        self,
        *,
        min_lon: float,
        min_lat: float,
        max_lon: float,
        max_lat: float,
        types: list[str] | None = None,
        sync_osm: bool = True,
    ) -> list[PlaceDTO]: ...

    @abstractmethod
    async def ensure_osm_place(
        self,
        *,
        osm_id: str,
        name: str,
        place_type: str,
        lat: float,
        lon: float,
        address_text: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> PlaceDTO: ...

    @abstractmethod
    async def add_favorite(self, user_id: UUID, place_id: UUID) -> PlaceFavoriteDTO: ...

    @abstractmethod
    async def remove_favorite(self, user_id: UUID, place_id: UUID) -> None: ...

    @abstractmethod
    async def list_favorites(self, user_id: UUID) -> list[PlaceFavoriteDTO]: ...
