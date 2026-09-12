# Аудит бэкенда перед React Native (2026-09-10)

Проверка: PgBouncer, кеш, auth, индексы, realtime, пробелы относительно ТЗ.

## Критично (чинить до/на старте RN)

1. **JWT на WebSocket не проверяет `exp`** — просроченный токен остаётся валидным (`presentation/v1/realtime/ws.py`).
2. **Realtime только in-memory** — `NoOpPresencePublisher`, Redis pub/sub не подключён; при `API_WORKERS>1` друзья на разных воркерах не видят обновления.
3. **Nginx в docker не проксирует Upgrade для API WS** — только Grafana; `/api/v1/ws/` сломается через nginx.
4. **Кеш профиля без инвалидации** — `@cache` на `GET /profile/me` и `GET /profile/{id}`, после PATCH/avatar до 60 с отдаётся старое.

## Высокий приоритет

5. Нет refresh-токена; access = 30 мин — для мобилки неудобно (нужен refresh или длиннее access + безопасное хранение).
6. OpenAPI `tokenUrl` = `api/auth/jwt/login`, реально `/api/v1/auth/jwt/login`.
7. HTTP `POST /map/location` не пушит друзьям (только WS на том же процессе).
8. Настройки `share_precise_location` / battery / speed **не применяются** в снимке друзей.
9. `has_chat` в списке мест bbox всегда false (заполняется только в get по id).
10. Нет `POST /profile/me/geo-freeze-all` из плана.
11. Нет загрузки вложений в чат (таблица есть).
12. Alembic/Celery в docker через PgBouncer: `DB_DIRECT_*` в конфиге есть, в коде не используются.
13. Логин без отдельного rate limit (только глобальный middleware).
14. Индексы: `(messages.chat_id, created_at)`, `chat_members(user_id)` — отсутствуют.

## Средний приоритет

15. Celery beat не настроен — expire freeze / purge history / deletion не по расписанию.
16. Удаление аккаунта сразу `is_active=false` без «мягкого» окна в онлайне; hard delete не делается.
17. N+1 в списках друзей/чатов/избранного/фан-ауте WS.
18. WS «burst» счётчик не сбрасывается — соединение умрёт после ~30k кадров.
19. Bbox мест по lat/lon, GiST `geom` не используется.
20. `phone` из плана не реализован.
21. Пагинация друзей/чатов/мест непоследовательна.
22. Partial unique `osm_id WHERE source=osm` — сделан полный unique.

## Что уже хорошо

- Docker: app → PgBouncer transaction + `NullPool` + `statement_cache_size=0`.
- Локальный `.env`: прямой Postgres (`15432`), `DB_USE_PGBOUNCER=false` — нормально для host uvicorn.
- Partial unique pending-заявок, home per user, client_message_id, GiST/GIN, friendship pair.
- Гео/чаты/друзья не закешированы ошибочно.
- Rate limit на register / location / messages / create place.
- Bearer JWT подходит для RN (cookie — для веба).

## PgBouncer сейчас

| Режим | Как |
|-------|-----|
| `make infra` + uvicorn на хосте | Прямой Postgres, PgBouncer поднят на `16432`, но приложение **не ходит** в него (`USE_PGBOUNCER=false`) |
| `make up-dev` | App в docker → pgbouncer → db |

Чтобы локально через PgBouncer: `DB_HOST=localhost`, `DB_PORT=16432`, `DB_USE_PGBOUNCER=true` (+ Alembic на прямой `15432` через `DB_DIRECT_*` после фикса кода).

## Рекомендуемый порядок фикса перед RN

1. JWT exp на WS + Redis pub/sub presence/chat + nginx WS.
2. Инвалидация кеша профиля (или временно снять `@cache`).
3. Privacy flags в snapshot + has_chat в bbox + индексы messages/chat_members.
4. Refresh token (или политика токена для мобилки) + tokenUrl + login rate limit.
5. geo-freeze-all, вложения, beat, DIRECT_* для миграций.
