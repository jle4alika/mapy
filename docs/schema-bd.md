# Схема базы данных Blink20

## Расширения

- `postgis` — география мест и позиций
- `pgcrypto` / `gen_random_uuid()` — UUID

## Таблицы

| Таблица | Назначение |
|--------|------------|
| `users` | Учётки + профиль (display_name, avatar, bio, status, last_seen, scheduled_deletion) |
| `user_privacy_settings` | Флаги шаринга гео/батареи/скорости |
| `user_notification_settings` | Настройки уведомлений |
| `friend_requests` | Заявки в друзья |
| `friendships` | Взаимная дружба (упорядоченная пара) |
| `user_blocks` | Блокировки |
| `friend_visibility_overrides` | Заморозка / приближённая точность на друга |
| `user_locations` | Текущая позиция (lat/lon + geography) |
| `location_history` | Краткий след движения |
| `places` | Каталог мест (osm/user) |
| `place_favorites` | Избранные места |
| `chats` | Чаты (direct/place) |
| `direct_chat_pairs` | Пара пользователей личного чата |
| `place_chats` | Связь чат ↔ место |
| `chat_members` | Участники |
| `messages` | Сообщения (+ client_message_id) |
| `message_attachments` | Вложения |
| `map_region_packs` | Манифест офлайн-регионов |
| `map_pack_files` | Файлы пакетов (url, checksum, format) |

## Ключевые индексы

- GiST по `user_locations.geom`, `places.geom`
- UNIQUE дружбы `(user_low_id, user_high_id)`
- UNIQUE pending-заявок (partial)
- UNIQUE `(chat_id, author_id, client_message_id)` для идемпотентности
- `(chat_id, created_at DESC)` для ленты сообщений
- UNIQUE `places.osm_id` (partial, source=osm)

Миграция: `alembic/versions/b1c2d3e4f5a6_blink20_core_schema.py`.
