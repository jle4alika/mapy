"""ORM ↔ places."""

from __future__ import annotations

from domains.places.domain.entities import Place, PlaceFavorite
from domains.places.infrastructure.models import PlaceFavoriteModel, PlaceModel


def to_entity(m: PlaceModel) -> Place:
    return Place(
        id=m.id,
        source=m.source,  # type: ignore[arg-type]
        osm_id=m.osm_id,
        creator_id=m.creator_id,
        name=m.name,
        place_type=m.place_type,
        address_text=m.address_text,
        lat=m.lat,
        lon=m.lon,
        is_public=m.is_public,
        metadata=dict(m.metadata_json or {}),
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


def favorite_to_entity(m: PlaceFavoriteModel) -> PlaceFavorite:
    return PlaceFavorite(
        user_id=m.user_id,
        place_id=m.place_id,
        created_at=getattr(m, "created_at", None),
    )
