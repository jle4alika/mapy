#!/usr/bin/env bash
# Деплой Mapy на VPS (из /opt/mapy после git clone)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

PUBLIC_APP_URL="${PUBLIC_APP_URL:-http://$(curl -4 -fsS ifconfig.me 2>/dev/null || echo 127.0.0.1)}"
export PUBLIC_APP_URL

if [[ ! -f .env ]]; then
  echo "Нет backend/.env — скопируйте из .env.example и задайте секреты"
  exit 1
fi

# Подставить публичный URL в .env (STORAGE / CORS уже через compose env)
docker compose --env-file .env -f deploy/compose.prod.yml pull || true
PUBLIC_APP_URL="$PUBLIC_APP_URL" docker compose --env-file .env -f deploy/compose.prod.yml up --build -d

echo "OK: $PUBLIC_APP_URL"
docker compose --env-file .env -f deploy/compose.prod.yml ps
