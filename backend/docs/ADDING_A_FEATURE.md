# Как добавить новый тип ручек (домен)

Эталон в репозитории — **`domains/users`** + **`presentation/v1/users`**.  
Копируй этот слайс, не изобретай вторую архитектуру.

## Карта за 30 секунд

```text
HTTP  presentation/v1/<feature>/routers.py
         │  Depends → service
         ▼
App   domains/<feature>/application/
         │  service (use-case) → ports (ABC) → DTO
         ▼
Domain domains/<feature>/domain/
         │  entity + методы + errors  (без FastAPI/SQLAlchemy)
         ▼
Infra  domains/<feature>/infrastructure/
         │  ORM-модель, repository, uow  (+ ACL, если чужой фреймворк)
         ▼
Shared infrastructure/*   (postgres, redis, smtp, …)
```

**Правило импортов (enforce: `make lint` → import-linter):**

| Можно импортировать ↓ \ из → | domain | application | feature infra | presentation |
|------------------------------|:------:|:-----------:|:-------------:|:------------:|
| domain                       |  ✓     |  ✓          |  ✓            |  ✓           |
| application                  |  ✗     |  ✓          |  ✓            |  ✓           |
| feature infra / global infra |  ✗     |  ✗          |  ✓            |  ✓           |
| presentation                 |  ✗     |  ✗          |  ✗            |  ✓           |

`common` и `core` — shared kernel / config; **не** клади туда бизнес-логику фичи.

---

## Чеклист нового домена (например `notes`)

### 1. Domain — сущность и правила

`domains/notes/domain/entities.py` (+ `errors.py` при необходимости):

```python
@dataclass(slots=True, kw_only=True)
class Note:
    id: UUID
    title: str
    body: str
    owner_id: UUID

    def rename(self, title: str) -> None:
        if not title.strip():
            raise InvalidNoteError("title пустой")
        self.title = title
```

Только поведение и инварианты. Никакого `Depends`, ORM, Pydantic Request.

### 2. Application — use-case + порты + DTO ответа

```text
domains/notes/application/
  ports.py      # AbstractNoteRepository, AbstractNoteService, UoW
  service.py    # NoteService(uow).create_note / get_note
  dto.py        # только реальные ответы API (не пирамида DTO)
  mappers.py    # Note → NoteDTO
```

- **Один DTO на один shape ответа.** Не заводи `Short/Public/Read/Me`, пока нет разных ручек.
- Service поднимает доменные ошибки (`NotFoundError`, свои `AppError`) — HTTP мапит глобальный handler / router.

### 3. Infrastructure — БД

```text
domains/notes/infrastructure/
  models.py       # SQLAlchemy NoteModel(UUIDBase)
  orm_mapper.py   # NoteModel → Note
  repository.py   # implements AbstractNoteRepository
  uow.py          # NoteUnitOfWork
```

Alembic: импорт `NoteModel` в `alembic/env.py` (как `UserModel`) → `make revision msg="add notes"`.

### 4. Presentation — только HTTP v1

```text
presentation/v1/notes/
  dependencies.py   # get_note_uow / get_note_service / NoteServiceDep
  routers.py        # APIRouter, response_model=DTO из application
```

Подключи роутер в `presentation/v1/router.py`:

```python
api_v1_router.include_router(notes_router)
```

Префикс версии — **только здесь** (`presentation/v1`), не в `domains/`.

### 5. Composition root

Обычно ничего в `app.py`, если роутер уже в `api_v1_router`.  
Auth-роутеры fastapi-users — исключение (живут в `app.py`).

### 6. Тесты

```text
tests/unit/domains/notes/test_entity.py
tests/unit/domains/notes/test_service.py      # мок UoW/ports
tests/api/test_notes.py                       # override get_note_service
```

---

## Какие схемы (Pydantic) создавать

| Тип | Где | Когда |
|-----|-----|--------|
| **Response DTO** | `application/dto.py` | Каждая ручка с другим JSON-ответом |
| **Request body** | `presentation/...` *или* рядом с ACL | Только если body не покрыт fastapi-users / простой Query |
| **Auth/CRUD чужой либы** | `infrastructure/*_schemas.py` | Как `UserCreate` для fastapi-users |
| Domain entity | `domain/entities.py` | **Не** Pydantic |

Дублировать валидацию username/email в Pydantic и в domain не надо: в schema-валидаторе зови `Entity.validate_…` и переводи ошибку в `ValueError`.

---

## Типы ручек — куда класть логику

| Ручка | Куда |
|-------|------|
| Чтение/запись своей сущности | `application.Service` + `repository` |
| «Тонкий» proxy к либе (login/register) | `infrastructure` ACL + `app.py` include_router |
| Фоновая задача | `infrastructure/celery_workers/tasks/` + вызов из service |
| Событие в очередь | `infrastructure/rabbitmq` + вызов из service **после** commit |
| Кэш ответа | декоратор `@cache` на router (presentation), key_builder уже исключает Service |

---

## Антипаттерны

- Класть ORM-модель в `domain/`  
- Service импортирует FastAPI `Request` / `HTTPException`  
- Новая папка `domains/v2/...` из‑за версии API — версия только в `presentation/vN`  
- Плодить DTO «на вырост» без ручки  
- Бизнес-правила только в Pydantic `field_validator` без domain-метода  

---

## Быстрый скелет файлов

```bash
# из корня, подставь NAME=notes
NAME=notes
BASE=api/domains/$NAME
mkdir -p $BASE/{domain,application,infrastructure}
mkdir -p api/presentation/v1/$NAME
# дальше скопируй/адаптируй файлы из domains/users и presentation/v1/users
```

После изменений: `make lint && make test`.
