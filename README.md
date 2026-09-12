# Mapy

Социальная карта: друзья на карте в реальном времени и чаты у мест по России.

- Клиент: [`mobile/`](mobile/)
- Backend: [`backend/`](backend/)
- Карта: MapLibre + OpenFreeMap / OSM
- Дизайн: строгий картографический UI (ориентир — Яндекс.Карты)

## Локально

```bash
# API
cd backend && poetry run uvicorn api.app:app --host 0.0.0.0 --port 8001

# Клиент
cd mobile && npx expo start --web
```

## Прод (VPS)

Репозиторий: https://github.com/jle4alika/mapy

```bash
cd /opt/mapy/backend
# .env из .env.example + секреты
PUBLIC_APP_URL=http://YOUR_IP docker compose --env-file .env -f deploy/compose.prod.slim.yml up --build -d
```

- Web: `http://YOUR_IP/`
- API health: `http://YOUR_IP/health`
