# Архитектура шаблона (кратко)

Подробный рецепт новой фичи: **[ADDING_A_FEATURE.md](./ADDING_A_FEATURE.md)**.

## Слои

```text
presentation/v1   → HTTP (роутеры, Depends), версия API только здесь
domains/<name>/
  domain/         → сущности + методы + errors
  application/    → use-cases, ports (ABC), DTO ответов, mappers
  infrastructure/ → ORM, repo, uow, адаптеры сторонних либ (fastapi-users)
infrastructure/   → postgres, redis, rabbit, celery, smtp, cache
common/           → shared kernel (BaseDTO, AppError, NotFoundError)
core/             → settings, logging
app.py            → composition root
```

## Эталон

`domains/users` — полный вертикальный слайс (профиль + ACL auth).  
Новые ручки проектируй по тому же рисунку.

## Контроль границ

```bash
make lint   # black --check + import-linter
```
