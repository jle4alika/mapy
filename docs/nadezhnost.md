# Надёжность: пул, транзакции, ошибки

## Пул соединений

### Прямой Postgres (`DB_USE_PGBOUNCER=false`, локальный uvicorn)

| Параметр | Значение |
|----------|----------|
| `DB_POOL_SIZE` | 20 |
| `DB_MAX_OVERFLOW` | 30 |
| `DB_POOL_TIMEOUT` | 30 с |
| `DB_POOL_RECYCLE` | 1800 с |
| `pool_pre_ping` | да |
| `API_WORKERS` | 4 |

Правило: `воркеры × (pool_size + max_overflow) ≤ max_connections − запас`.  
Сейчас: `4 × 50 = 200`, Postgres `max_connections = 300` (запас на Celery/миграции).

### Через PgBouncer (`DB_USE_PGBOUNCER=true`, docker prod)

Приложение: **NullPool** (соединение на запрос через PB) + `statement_cache_size=0`.

| PgBouncer | Значение |
|-----------|----------|
| `MAX_CLIENT_CONN` | 2000 |
| `DEFAULT_POOL_SIZE` | 50 (серверных к Postgres на БД) |
| `MIN_POOL_SIZE` | 10 |
| `RESERVE_POOL_SIZE` | 25 |
| `POOL_MODE` | transaction |

Миграции Alembic — на `DB_DIRECT_*` (минуя PB).

## Транзакции

- `get_session`: при исключении — `rollback`, в `finally` — `close`
- `BaseUnitOfWork`: rollback при ошибке в контексте; `commit` ловит `IntegrityError` → `ConflictError`, прочие SQL → `ServiceUnavailableError`

## Ошибки (все тексты клиенту на русском)

Формат: `{"detail": "...", "code": "...", "errors"?: [...]}`

| Класс | HTTP | code |
|-------|------|------|
| NotFoundError | 404 | not_found |
| AppError | 400 | app_error |
| ConflictError | 409 | conflict |
| ForbiddenError | 403 | forbidden |
| UnauthorizedError | 401 | unauthorized |
| ValidationAppError | 422 | validation_error |
| RateLimitExceededError | 429 | rate_limit |
| ServiceUnavailableError | 503 | service_unavailable |
| RequestValidationError | 422 | validation_error |
| IntegrityError | 409 | conflict |
| OperationalError | 503 | service_unavailable |
| Exception | 500 | internal_error |

500 никогда не отдаёт стек/английский текст наружу — только лог.

## try/except

Не оборачиваем каждый сервисный метод. Границы:

1. HTTP → глобальные handlers
2. Сессия/UoW → rollback
3. WebSocket кадр → `AppError` / валидация / 500 на русском
4. Redis publish / Celery / Rabbit → лог + не валим запрос

## Оценка пропускной способности (замер 2026-09-10)

Железо: локальный host, uvicorn `--workers 4`, Postgres+PostGIS в Docker, прямой пул 20+30, rate limit **выключен** для замера ёмкости.

| Сценарий | RPS (прибл.) | Примечание |
|----------|--------------|------------|
| `GET /health` | **~5200** | без БД |
| `GET /profile/me` | **~700** | JWT + БД/кэш |
| `GET /map/offline-packs` | **~600** | JWT + чтение БД |
| `GET /map/friends` | **~480** | JWT + друзья/гео |
| `POST /map/location` | **~150–250** | запись + throttle домена |

**Рабочий смешанный профиль** (карта + чаты + профили) на одном инстансе: ориентир **400–700 RPS** при 4 воркерах.

С включённым `RATE_LIMIT` (300 req/s на IP) один клиентский IP упирается в лимит защиты, а не в пул — так и задумано для продакшена.

Логин (bcrypt) — отдельно: обычно **50–150 RPS** на CPU, не упирается в пул БД.

## WebSocket

- Проверка подписи JWT и **`exp`**
- Скользящее окно антифлуда (60 кадров / 10 с)
- Ошибки кадра: `{type, payload: {detail, code}}`
