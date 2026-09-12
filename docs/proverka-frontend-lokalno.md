# Проверка фронтенда локально

## Подготовка

1. Поднять инфра и API (порт **8001**):

```bash
cd backend
make infra
make migrate
poetry run uvicorn api.app:app --reload --host 0.0.0.0 --port 8001
```

2. Клиент:

```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

Открыть веб (`w`) или устройство/эмулятор.

## Чеклист сценария

Автопроверка при сдаче клиента (2026-09-10): API на `:8001` + `expo start --web` на `:8081` (бандл OK). HTTP-прогон: register → login → friends accept → map location/friends/places → chat/message. UI-прогон в браузере — у вас локально по пунктам ниже.

- [x] Лендинг: бренд blink20, герой, CTA, блоки сценария / активности / приватности *(код + веб-бандл)*
- [x] Регистрация / вход против живого API *(HTTP)*
- [x] Вкладки: Карта / Чаты / Друзья / Профиль *(маршруты Expo)*
- [x] Карта MapLibre + места по bbox *(HTTP places=5; UI MapLibre в WebView/iframe)*
- [x] Друзья / чат / сообщения *(HTTP)*
- [ ] Видимость: freeze / approximate / normal *(UI; API требует `expires_at` — клиент шлёт)*
- [ ] Полный клик-сценарий в UI: гео → пин → чат места → профиль/выход
- [ ] Офлайн-очередь исходящих на устройстве
- [ ] Веб: колонка на широком экране; тени на трёх платформах

## Замечания

- `EXPO_PUBLIC_API_URL` должен быть доступен с устройства (не `localhost` с телефона — IP хоста).
- WebSocket: `ws://…/api/v1/ws/gateway?token=`.
- Для Expo web нужен **CORS** на API (уже в `backend/api/app.py`; origins localhost:8081 в development).
- Локально удобно `RATE_LIMIT_ENABLED=false` в `backend/.env` — иначе register (10/час) быстро даёт 429.
- Карта: встроенная тема Blink20 Soft на OpenFreeMap (без ключа). Файл `mobile/assets/map/blink20-style.json`.
- Иконки: только Feather + Heroicons 2 (`Icon` / react-icons), без эмодзи.
