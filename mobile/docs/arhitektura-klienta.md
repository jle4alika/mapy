# Архитектура клиента Blink20

Слои Feature-Sliced:

```text
app/           # маршруты Expo Router (тонкие экраны)
src/shared/    # тема, UI-кит, http, хуки
src/entities/  # типы User, Place, Chat, FriendLocation
src/features/  # auth, presence, friend-request, chat
src/widgets/   # MapCanvas, ChatThread, LandingHero, …
src/processes/ # старт сессии, геолокация
```

Правила:

- Маршруты только собирают виджеты и фичи.
- Запросы к API — только через `shared/api`.
- Бизнес-логика — в `features`, не в экранах.
- Состояние сессии / камеры / черновиков — Zustand.
- Серверные данные — TanStack Query.

Связь с бэкендом: `EXPO_PUBLIC_API_URL` → `/api/v1`, WebSocket `/api/v1/ws/gateway?token=`.
