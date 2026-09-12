# Каталог HTTP-ручек (v1)

Префикс: `/api/v1`

## Auth

- `POST /auth/register`
- `POST /auth/jwt/login`
- `POST /auth/jwt/logout`
- cookie-варианты под `/auth/cookie/...`
- reset / verify — как в шаблоне

## Профиль

- `GET/PATCH /profile/me`
- `POST /profile/me/avatar`
- `DELETE /profile/me` — планирование удаления
- `GET/PUT /profile/privacy`
- `GET/PUT /profile/notification-settings`
- `GET /profile/{user_id}`
- `GET/POST/DELETE /profile/favorite-places`

## Друзья и приватность гео

- `GET /friends`
- `GET/POST /friends/requests`
- `POST /friends/requests/{id}/accept|reject|cancel`
- `DELETE /friends/{friend_id}`
- `POST/DELETE /users/{id}/block`
- `GET /privacy/visibility`
- `PUT /privacy/visibility/{friend_id}`

## Карта

- `GET /map/friends`
- `POST /map/location`
- `GET /map/activity`
- `GET/POST /map/places`
- `GET /map/places/{id}`
- `GET /map/offline-packs`
- `GET /map/offline-packs/{code}`

## Чаты

- `GET /chats`
- `POST /chats/direct`
- `POST /places/{place_id}/chat`
- `GET/POST /chats/{id}/messages`
- `POST /chats/{id}/read`
- `DELETE /messages/{id}`

## WebSocket

- `/ws/gateway?token=`

## Служебные

- `GET /health`
- `GET /api/docs`
- статика аватаров: `/media/...`
