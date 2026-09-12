"""Тесты нормализации имён OSM-мест."""

from domains.places.infrastructure.osm_sync import (
    element_to_place_row,
    is_generic_place_name,
    resolve_place_name,
    truncate_name,
)


def test_generic_slug_names():
    assert is_generic_place_name("cafe")
    assert is_generic_place_name("convenience")
    assert is_generic_place_name("car_repair")
    assert is_generic_place_name("Место")
    assert is_generic_place_name("yes")
    assert not is_generic_place_name("Шоколадница")
    assert not is_generic_place_name("Cafe Pushkin")
    assert not is_generic_place_name("KFC")


def test_resolve_replaces_slug_with_russian():
    assert resolve_place_name("cafe", place_type="cafe") == "Кафе"
    assert resolve_place_name("pharmacy", place_type="shop") == "Аптека"
    assert resolve_place_name("Шоколадница", place_type="cafe") == "Шоколадница"
    assert truncate_name("cafe") == ""


def test_element_to_place_row_ignores_amenity_as_name():
    row = element_to_place_row(
        {
            "type": "node",
            "id": 1,
            "lat": 55.75,
            "lon": 37.62,
            "tags": {"amenity": "cafe", "name": "cafe"},
        }
    )
    assert row is not None
    assert row["name"] == "Кафе"
    assert row["place_type"] == "cafe"

    row2 = element_to_place_row(
        {
            "type": "node",
            "id": 2,
            "lat": 55.75,
            "lon": 37.62,
            "tags": {"shop": "convenience"},
        }
    )
    assert row2 is not None
    assert row2["name"] == "Магазин"
    assert row2["place_type"] == "shop"
