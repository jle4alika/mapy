# Changelog

## 0.1.0 — 2026-07-25

- Onion: `domains/users/{domain,application,infrastructure}` + `presentation/v1` (HTTP)
- `infrastructure/` (postgres/redis/rabbit/celery/smtp/cache); `common/` = shared kernel
- fastapi-users как ACL (`UserModel`), domain entity `User` без SQLAlchemy
- import-linter contracts; MIT; Poetry + black + pytest
