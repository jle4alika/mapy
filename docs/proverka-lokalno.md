# Проверка ручек локально

Дата: 2026-09-09

## Окружение

- Postgres+PostGIS: `127.0.0.1:15432` (контейнер `blink20-infra-db-1`)
- Redis: `127.0.0.1:6381`
- RabbitMQ: `127.0.0.1:5672`
- API: `http://127.0.0.1:8001` (порт 8000 на машине был занят)

```bash
cd backend
make infra
make migrate
make seed-places
make seed-map-packs
poetry run uvicorn api.app:app --host 127.0.0.1 --port 8001
```

Документация: http://127.0.0.1:8001/api/docs

## Чеклист сценария

| Шаг | Результат |
|-----|-----------|
| `GET /health` | ok |
| Регистрация alice/bob | 201/200 |
| Логин JWT | access_token |
| `GET/PATCH /profile/me` | профиль + статус «в пути» |
| Заявка в друзья + accept | статус accepted |
| `GET /friends` | bob в списке |
| `POST /map/location` | moving / stationary |
| `GET /map/friends` | позиция друга с accuracy_mode |
| `GET /map/places?bbox=` | 5 демо-мест |
| `POST /places/{id}/chat` | чат «АЗС Центр» |
| `POST /chats/{id}/messages` | сообщение с client_message_id |
| Чтение сообщений другом | видно текст |
| `POST /chats/direct` | личный чат |
| Заморозка >24ч | ошибка «Максимум 24 часа» |
| Заморозка на 2ч | mode=frozen |
| `GET /map/offline-packs` | ru-msk, ru-spb |
| `GET /map/activity` | статус друга |
| Избранное места | ok |

## Тесты

```bash
poetry run pytest -q tests/unit/domains/friends tests/unit/domains/location tests/unit/domains/chats tests/unit/domains/users tests/api
# 33 passed
```

## Замечания

- Порты Postgres/Redis в `.env` сдвинуты (15432 / 6381), чтобы не конфликтовать с другими контейнерами на хосте.
- Реальные файлы MBTiles в манифесте — заглушки URL (`example.invalid`); клиент скачает их, когда появятся настоящие пакеты.
