# Mapy

Социальная карта: друзья на карте в реальном времени и чаты у мест по России.

- Клиент: [`mobile/`](mobile/)
- Backend: [`backend/`](backend/)
- Карта: MapLibre + OpenFreeMap / OSM
- Дизайн: строгий картографический UI (ориентир — Яндекс.Карты)

```bash
# API
cd backend && poetry run uvicorn api.app:app --host 0.0.0.0 --port 8001

# Клиент
cd mobile && npx expo start --web
```
