"""Синхронизация POI из OpenStreetMap (Overpass) в places."""

from __future__ import annotations

import logging
import re
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Грубая рамка РФ (+ Калининград / Крым / Чукотка)
RU_MIN_LON, RU_MIN_LAT = 19.0, 41.0
RU_MAX_LON, RU_MAX_LAT = 191.0, 82.0

OVERPASS_URLS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/cgi/interpreter",
)

# class/subclass OpenMapTiles → наш place_type
OMT_CLASS_TO_TYPE: dict[str, str] = {
    "cafe": "cafe",
    "restaurant": "cafe",
    "fast_food": "cafe",
    "bar": "cafe",
    "pub": "cafe",
    "biergarten": "cafe",
    "food_court": "cafe",
    "ice_cream": "cafe",
    "fuel": "gas_station",
    "charging_station": "gas_station",
    "shop": "shop",
    "supermarket": "shop",
    "convenience": "shop",
    "mall": "shop",
    "clothes": "shop",
    "bakery": "shop",
    "pharmacy": "shop",
    "bookstore": "shop",
    "bank": "shop",
    "atm": "shop",
    "hotel": "shop",
    "hostel": "shop",
    "lodging": "shop",
    "hospital": "shop",
    "clinic": "shop",
    "office": "shop",
    "bus": "transit",
    "bus_stop": "transit",
    "bus_station": "transit",
    "rail": "transit",
    "railway": "transit",
    "station": "transit",
    "halt": "transit",
    "subway": "transit",
    "subway_entrance": "transit",
    "tram": "transit",
    "tram_stop": "transit",
    "ferry": "transit",
    "ferry_terminal": "transit",
    "airport": "transit",
    "aerodrome": "transit",
    "parking": "transit",
    "park": "park",
    "garden": "park",
    "pitch": "park",
    "playground": "park",
    "nature_reserve": "park",
    "museum": "park",
    "attraction": "park",
    "theatre": "park",
    "cinema": "park",
    "monument": "park",
    "viewpoint": "park",
    "school": "park",
    "college": "park",
    "university": "park",
    "library": "park",
    "place_of_worship": "park",
}

AMENITY_TO_TYPE: dict[str, str] = {
    "cafe": "cafe",
    "restaurant": "cafe",
    "fast_food": "cafe",
    "bar": "cafe",
    "pub": "cafe",
    "biergarten": "cafe",
    "fuel": "gas_station",
    "charging_station": "gas_station",
    "pharmacy": "shop",
    "bank": "shop",
    "atm": "shop",
    "bureau_de_change": "shop",
    "hospital": "shop",
    "clinic": "shop",
    "doctors": "shop",
    "dentist": "shop",
    "bus_station": "transit",
    "ferry_terminal": "transit",
    "parking": "transit",
    "townhall": "shop",
    "community_centre": "park",
    "library": "park",
    "school": "park",
    "college": "park",
    "university": "park",
    "place_of_worship": "park",
}

SHOP_TYPES = {"shop"}
TRANSIT_RAILWAY = {"station", "halt", "subway_entrance", "tram_stop"}
PARK_LEISURE = {"park", "garden", "nature_reserve"}


def clamp_bbox_to_russia(
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
) -> tuple[float, float, float, float] | None:
    min_lon = max(min_lon, RU_MIN_LON)
    min_lat = max(min_lat, RU_MIN_LAT)
    max_lon = min(max_lon, RU_MAX_LON)
    max_lat = min(max_lat, RU_MAX_LAT)
    if min_lon >= max_lon or min_lat >= max_lat:
        return None
    return min_lon, min_lat, max_lon, max_lat


def bbox_span_ok(min_lon: float, min_lat: float, max_lon: float, max_lat: float) -> bool:
    """Не тянем Overpass на слишком большой viewport."""
    return (max_lon - min_lon) <= 1.2 and (max_lat - min_lat) <= 0.9


def map_omt_to_place_type(class_: str | None, subclass: str | None = None) -> str:
    for key in (subclass, class_):
        if key and key in OMT_CLASS_TO_TYPE:
            return OMT_CLASS_TO_TYPE[key]
    return "custom"


def map_osm_tags_to_place_type(tags: dict[str, Any]) -> str:
    amenity = tags.get("amenity")
    if amenity in AMENITY_TO_TYPE:
        return AMENITY_TO_TYPE[amenity]
    if tags.get("shop") or tags.get("office") or tags.get("craft"):
        return "shop"
    if tags.get("tourism") in {"hotel", "hostel", "motel", "guest_house", "apartment"}:
        return "shop"
    railway = tags.get("railway")
    if railway in TRANSIT_RAILWAY or tags.get("public_transport") in {"station", "stop_position", "platform"}:
        return "transit"
    if tags.get("highway") == "bus_stop":
        return "transit"
    if tags.get("leisure") in PARK_LEISURE:
        return "park"
    if tags.get("aeroway") == "aerodrome":
        return "transit"
    return "custom"


# OSM amenity/shop/class часто попадает в name — это не название заведения
OSM_SLUG_LABELS_RU: dict[str, str] = {
    "cafe": "Кафе",
    "restaurant": "Ресторан",
    "fast_food": "Фастфуд",
    "bar": "Бар",
    "pub": "Паб",
    "biergarten": "Пивная",
    "food_court": "Фуд-корт",
    "ice_cream": "Мороженое",
    "fuel": "АЗС",
    "charging_station": "Зарядка",
    "shop": "Магазин",
    "supermarket": "Супермаркет",
    "convenience": "Продукты",
    "mall": "ТЦ",
    "clothes": "Одежда",
    "bakery": "Пекарня",
    "pharmacy": "Аптека",
    "bookstore": "Книжный",
    "books": "Книжный",
    "department_store": "Универмаг",
    "grocery": "Продукты",
    "greengrocer": "Овощи",
    "marketplace": "Рынок",
    "alcohol": "Алкоголь",
    "wine": "Вино",
    "butcher": "Мясная",
    "florist": "Цветы",
    "furniture": "Мебель",
    "electronics": "Электроника",
    "hardware": "Хозтовары",
    "jewelry": "Ювелирный",
    "optician": "Оптика",
    "shoes": "Обувь",
    "gift": "Подарки",
    "sports": "Спорттовары",
    "stationery": "Канцтовары",
    "toys": "Игрушки",
    "laundry": "Прачечная",
    "hairdresser": "Парикмахерская",
    "beauty": "Салон красоты",
    "car_repair": "Автосервис",
    "car_parts": "Автозапчасти",
    "car": "Автосалон",
    "kiosk": "Киоск",
    "newsagent": "Газеты",
    "tobacco": "Табак",
    "pet": "Зоотовары",
    "ticket": "Билеты",
    "mobile_phone": "Связь",
    "doityourself": "Стройматериалы",
    "chemist": "Бытовая химия",
    "copyshop": "Копицентр",
    "travel_agency": "Турагентство",
    "vacant": "Магазин",
    "yes": "Магазин",
    "computer": "Компьютеры",
    "cheese": "Сыры",
    "seafood": "Рыба",
    "confectionery": "Кондитерская",
    "beverages": "Напитки",
    "tailor": "Ателье",
    "pawnbroker": "Ломбард",
    "houseware": "Товары для дома",
    "bicycle": "Веломагазин",
    "cosmetics": "Косметика",
    "shoe_repair": "Ремонт обуви",
    "photo": "Фото",
    "outdoor": "Туризм",
    "fabric": "Ткани",
    "variety_store": "Универсам",
    "dry_cleaning": "Химчистка",
    "second_hand": "Секонд-хенд",
    "funeral_directors": "Ритуальные услуги",
    "curtain": "Шторы",
    "pastry": "Выпечка",
    "dairy": "Молочные продукты",
    "baby_goods": "Детские товары",
    "rental": "Прокат",
    "garden_centre": "Садовый центр",
    "tyres": "Шины",
    "farm": "Фермерские продукты",
    "motorcycle": "Мотосалон",
    "tea": "Чай",
    "coffee": "Кофе",
    "paint": "Краски",
    "bookmaker": "Букмекер",
    "antiques": "Антиквариат",
    "appliance": "Бытовая техника",
    "perfumery": "Парфюмерия",
    "locksmith": "Ключи",
    "electrical": "Электрика",
    "deli": "Гастроном",
    "music": "Музыка",
    "video": "Видео",
    "lighting": "Свет",
    "kitchen": "Кухни",
    "bed": "Мебель для спальни",
    "carpet": "Ковры",
    "spices": "Специи",
    "hunting": "Охота",
    "fishing": "Рыбалка",
    "hifi": "Аудио",
    "bag": "Сумки",
    "religion": "Религиозные товары",
    "general": "Универмаг",
    "trade": "Оптовая торговля",
    "massage": "Массаж",
    "bathroom_furnishing": "Сантехника",
    "erotic": "Интим-магазин",
    "pyrotechnics": "Фейерверки",
    "agrarian": "Хозтовары",
    "tattoo": "Тату",
    "boutique": "Бутик",
    "photo_studio": "Фотостудия",
    "frame": "Багет",
    "radiotechnics": "Радиотехника",
    "interior_decoration": "Интерьер",
    "fashion_accessories": "Аксессуары",
    "tiles": "Плитка",
    "doors": "Двери",
    "outpost": "Пункт выдачи",
    "money_lender": "Микрофинансы",
    "leather": "Кожаные изделия",
    "tableware": "Посуда",
    "musical_instrument": "Музыкальные инструменты",
    "fireplace": "Камины",
    "watches": "Часы",
    "jewellery": "Ювелирный",
    "art": "Арт",
    "craft": "Хендмейд",
    "lottery": "Лотерея",
    "storage_rental": "Склады",
    "energy": "Энергия",
    "hearing_aids": "Слуховые аппараты",
    "medical_supply": "Медтовары",
    "nutrition_supplements": "БАДы",
    "party": "Праздничные товары",
    "pottery": "Керамика",
    "weapons": "Оружие",
    "wholesale": "Опт",
    "window_blind": "Жалюзи",
    "bank": "Банк",
    "atm": "Банкомат",
    "hospital": "Больница",
    "clinic": "Клиника",
    "doctors": "Врач",
    "dentist": "Стоматология",
    "hotel": "Отель",
    "hostel": "Хостел",
    "motel": "Мотель",
    "guest_house": "Гостиница",
    "lodging": "Гостиница",
    "office": "Офис",
    "post": "Почта",
    "post_office": "Почта",
    "police": "Полиция",
    "fire_station": "Пожарная",
    "town_hall": "Администрация",
    "townhall": "Администрация",
    "bus": "Автобус",
    "bus_stop": "Остановка",
    "bus_station": "Автовокзал",
    "rail": "Ж/д",
    "railway": "Ж/д",
    "station": "Станция",
    "halt": "Платформа",
    "subway": "Метро",
    "subway_entrance": "Метро",
    "tram": "Трамвай",
    "tram_stop": "Трамвай",
    "ferry": "Паром",
    "ferry_terminal": "Паром",
    "airport": "Аэропорт",
    "aerodrome": "Аэропорт",
    "parking": "Парковка",
    "bicycle_parking": "Велопарковка",
    "park": "Парк",
    "garden": "Сад",
    "pitch": "Площадка",
    "playground": "Детская площадка",
    "nature_reserve": "Заповедник",
    "museum": "Музей",
    "attraction": "Достопримечательность",
    "theatre": "Театр",
    "theater": "Театр",
    "cinema": "Кинотеатр",
    "monument": "Памятник",
    "viewpoint": "Смотровая",
    "school": "Школа",
    "college": "Колледж",
    "university": "Университет",
    "library": "Библиотека",
    "place_of_worship": "Храм",
    "community_centre": "Клуб",
}

GENERIC_PLACEHOLDERS = {
    "",
    "место",
    "место osm",
    "без названия",
    "точка",
    "точка на карте",
    "place",
    "poi",
    "custom",
    "unnamed",
    "unknown",
    "yes",
    "no",
    "null",
}

# Грубая категория без вывески — не считаем названием
RU_CATEGORY_LABELS = {
    "магазин",
    "кафе",
    "остановка",
    "азс",
    "парк",
    "точка",
    "точка на карте",
    "место",
    "место osm",
}


def type_fallback_name(place_type: str) -> str:
    return {
        "cafe": "Кафе",
        "gas_station": "АЗС",
        "shop": "Магазин",
        "transit": "Остановка",
        "park": "Парк",
        "home": "Дом",
        "custom": "Точка на карте",
    }.get(place_type, "Точка на карте")


def slug_fallback_name(slug: str, place_type: str = "custom") -> str:
    key = (slug or "").strip().lower()
    if key in OSM_SLUG_LABELS_RU:
        return OSM_SLUG_LABELS_RU[key]
    return type_fallback_name(place_type)


def is_generic_place_name(name: str | None) -> bool:
    """True если строка — не реальное имя (тег OSM, плейсхолдер, slug, категория)."""
    raw = (name or "").strip()
    if not raw:
        return True
    low = raw.lower()
    if low in GENERIC_PLACEHOLDERS or low in RU_CATEGORY_LABELS:
        return True
    if low in OSM_SLUG_LABELS_RU:
        return True
    if low in OMT_CLASS_TO_TYPE or low in AMENITY_TO_TYPE:
        return True
    if raw == low and raw.isascii() and re.fullmatch(r"[a-z][a-z0-9_]{0,40}", raw):
        if "_" in raw or raw in OSM_SLUG_LABELS_RU or raw in OMT_CLASS_TO_TYPE or raw in AMENITY_TO_TYPE:
            return True
        if len(raw) <= 2:
            return True
    return False


def truncate_name(name: str, max_len: int = 120) -> str:
    name = (name or "").strip()
    if is_generic_place_name(name):
        return ""
    return name if len(name) <= max_len else name[: max_len - 1] + "…"


def _accept_brand(name: str | None) -> str:
    raw = (name or "").strip()
    if not raw:
        return ""
    low = raw.lower()
    if low in GENERIC_PLACEHOLDERS or low in RU_CATEGORY_LABELS:
        return ""
    if low in OSM_SLUG_LABELS_RU or low in OMT_CLASS_TO_TYPE or low in AMENITY_TO_TYPE:
        return ""
    return raw if len(raw) <= 120 else raw[:119] + "…"


def resolve_place_name(
    *candidates: str | None,
    place_type: str = "custom",
    osm_slug: str | None = None,
    brand_candidates: tuple[str | None, ...] | list[str | None] | None = None,
) -> str:
    for cand in candidates:
        cleaned = truncate_name(cand or "")
        if cleaned:
            return cleaned
    for cand in brand_candidates or ():
        brand = _accept_brand(cand)
        if brand:
            return brand
    if osm_slug:
        return slug_fallback_name(osm_slug, place_type)
    return type_fallback_name(place_type)


def name_from_osm_tags(tags: dict[str, Any], place_type: str | None = None) -> str:
    """Собрать лучшее имя из OSM-тегов (синк и backfill)."""
    ptype = place_type or map_osm_tags_to_place_type(tags)
    osm_slug = (
        tags.get("amenity")
        or tags.get("shop")
        or tags.get("railway")
        or tags.get("highway")
        or tags.get("leisure")
        or tags.get("tourism")
        or tags.get("aeroway")
        or tags.get("office")
        or tags.get("craft")
    )
    return resolve_place_name(
        tags.get("name"),
        tags.get("name:ru"),
        tags.get("name:en"),
        tags.get("official_name"),
        tags.get("alt_name"),
        tags.get("ref"),
        place_type=ptype,
        osm_slug=str(osm_slug) if osm_slug else None,
        brand_candidates=(
            tags.get("brand"),
            tags.get("brand:ru"),
            tags.get("operator"),
        ),
    )


def synthetic_omt_osm_id(*, class_: str, subclass: str | None, lon: float, lat: float) -> str:
    """OpenMapTiles в тайлах часто без osm id — стабильный ключ по координате."""
    return f"omt:{class_ or 'poi'}:{subclass or '-'}:{round(lon, 5)}:{round(lat, 5)}"


def build_overpass_query(min_lat: float, min_lon: float, max_lat: float, max_lon: float) -> str:
    # south,west,north,east — только node + фильтр по территории РФ
    bbox = f"{min_lat},{min_lon},{max_lat},{max_lon}"
    return f"""
[out:json][timeout:55];
area["ISO3166-1"="RU"][admin_level=2]->.ru;
(
  node["amenity"~"^(cafe|restaurant|fast_food|bar|pub|biergarten|fuel|charging_station|pharmacy|bus_station|ferry_terminal)$"]({bbox})(area.ru);
  node["shop"]({bbox})(area.ru);
  node["railway"~"^(station|halt|subway_entrance|tram_stop)$"]({bbox})(area.ru);
  node["highway"="bus_stop"]({bbox})(area.ru);
  node["public_transport"~"^(station|stop_position)$"]({bbox})(area.ru);
  node["leisure"~"^(park|garden|nature_reserve)$"]({bbox})(area.ru);
  node["aeroway"="aerodrome"]({bbox})(area.ru);
);
out body;
""".strip()


async def fetch_overpass_elements(
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
    *,
    max_elements: int = 2500,
) -> list[dict[str, Any]]:
    query = build_overpass_query(min_lat, min_lon, max_lat, max_lon)
    headers = {
        "User-Agent": "Mapy/1.0 (places-sync; contact@mapy.local)",
        "Accept": "application/json",
    }
    last_err: Exception | None = None
    async with httpx.AsyncClient(timeout=60.0, headers=headers) as client:
        for url in OVERPASS_URLS:
            try:
                resp = await client.post(url, data={"data": query})
                resp.raise_for_status()
                payload = resp.json()
                elements = payload.get("elements") or []
                return elements[:max_elements]
            except Exception as exc:  # noqa: BLE001 — пробуем следующий endpoint
                last_err = exc
                logger.warning("Overpass %s failed: %s", url, exc)
    if last_err:
        logger.error("Overpass sync failed: %s", last_err)
    return []


def element_to_place_row(el: dict[str, Any]) -> dict[str, Any] | None:
    tags = el.get("tags") or {}
    etype = el.get("type")
    eid = el.get("id")
    if etype not in {"node", "way", "relation"} or eid is None:
        return None
    if etype == "node":
        lat, lon = el.get("lat"), el.get("lon")
    else:
        center = el.get("center") or {}
        lat, lon = center.get("lat"), center.get("lon")
    if lat is None or lon is None:
        return None
    place_type = map_osm_tags_to_place_type(tags)
    name = name_from_osm_tags(tags, place_type)
    return {
        "osm_id": f"{etype}/{eid}",
        "name": name,
        "place_type": place_type,
        "lat": float(lat),
        "lon": float(lon),
        "address_text": tags.get("addr:full")
        or ", ".join(
            x
            for x in (
                tags.get("addr:street"),
                tags.get("addr:housenumber"),
                tags.get("addr:city"),
            )
            if x
        )
        or None,
        "metadata": {"osm_tags": {k: v for k, v in tags.items() if not str(k).startswith("name") or k in {"name:en", "name:ru"}}},
    }
