# FastAPI Architecture Template

Шаблон backend API: **FastAPI**, **fastapi-users**, **SQLAlchemy 2 async**, **Redis**, **RabbitMQ**, **Celery**.  
Зависимости — **Poetry**. Всё нужное для поднятия бека — **в этой папке**.

> **Новые ручки / домен:** [`docs/ADDING_A_FEATURE.md`](docs/ADDING_A_FEATURE.md)  
> Кратко по слоям: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)  
> Эталон в коде: `api/domains/users` + `api/presentation/v1/users`

## Как использовать в своём сервисе

Скопируй эту папку (`backend/`) в репозиторий сервиса и работай из неё:

```bash
cd backend
cp .env.example .env
poetry install          # или: make install-dev
make infra && make migrate
poetry run uvicorn api.app:app --reload --port 8000
```

## Установка (в этой папке)

```bash
cp .env.example .env
poetry install          # или: make install-dev
```

Импорты `api…`, `common…`, `core…`, `domains…`, `infrastructure…`, `presentation…` работают через Poetry-пакеты.

## Быстрый старт

```bash
make infra
make migrate
poetry run uvicorn api.app:app --reload --port 8000
```

## Как спроектировать новую фичу (кратко)

```text
1. domain/entity + методы
2. application: ports + service + 1–2 response DTO
3. infrastructure: ORM + repository + uow
4. presentation/v1/<name>/routers.py + dependencies.py
5. include в presentation/v1/router.py
6. миграция + тесты
```

Не плоди схемы «на вырост»: DTO только под реальный JSON ручки.  
Auth fastapi-users — отдельные `*Create/*Update/*Read` в infrastructure ACL.

## Миграции

| Команда | Действие |
|---------|----------|
| `make migrate` | upgrade head |
| `make revision msg="…"` | autogenerate |
| `make migrate-down` | откат на 1 |

## Аутентификация

| Метод | Путь |
|--------|------|
| POST | `/api/v1/auth/register` |
| POST | `/api/v1/auth/jwt/login` |
| GET/PATCH/DELETE | `/api/v1/users/me` |
| GET | `/api/v1/profile/me`, `/api/v1/profile/{user_id}` |

## Celery (опционально)

По умолчанию worker в Docker **не** стартует.

```bash
make up-dev              # без Celery
make up-dev-celery       # + celery_worker + celery_exporter
# или в .env: COMPOSE_PROFILES=celery

make celery-worker       # локальный worker на хосте
```

```python
from infrastructure.celery_workers.tasks.example import ping, add
ping.delay()
```

Дашборд Grafana «Celery» в UI всегда; данные — после `up-*-celery`.

## Структура

```
.                      # корень шаблона (эта папка)
  pyproject.toml       # Poetry
  Makefile
  docs/
  api/         # Python-пакет: presentation, domains, infrastructure…
  alembic/
  deploy/
  tests/
```

## Тесты и качество

```bash
make test
make lint      # black --check + import-linter
make format
```
