# Импорт мест из OpenStreetMap (вся РФ)

## Как это работает

1. **Онлайн на карте** — OSM POI (тайлы) + места из БД с иконками категорий (как у Яндекса).
2. **При движении карты** — `GET /map/places?bbox=…&sync_osm=true` подтягивает новые точки из Overpass в БД.
3. **Ежедневно** — Celery Beat `places.sync_osm_daily` (04:15 МСК): города-приоритеты + скользящая сетка по РФ (новые/изменённые точки).
4. **Оффлайн** — клиент кэширует места по региональным ячейкам; без сети показывает последний снимок bbox.
5. **Клик по OSM-точке** → `POST /map/places/ensure-osm` → карточка / чат.

## Ежедневный синк

```bash
# с Celery (прод)
COMPOSE_PROFILES=celery make up-dev   # worker + beat

# вручную / cron без Beat
cd backend
PYTHONPATH=api poetry run python -m scripts.sync_places_daily
# или: make sync-places-daily
```

## Полный прогон сетки

```bash
cd backend
make import-russia-places
```

## Демо Москва

```bash
make seed-places
```

## Иконки категорий

На карте: `cafe`, `gas_station`, `shop`, `transit`, `park`, `custom` — цветные пины.
Базовые OSM-иконки — спрайт OpenFreeMap Liberty.
