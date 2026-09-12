# presentation/

Только HTTP. Версия API = имя пакета (`v1`, потом `v2`).

- Ручки users: [`v1/users/routers.py`](./v1/users/routers.py)
- Агрегатор: [`v1/router.py`](./v1/router.py) → подключается в `app.py` как `/api/v1`

Бизнес-логику сюда не класть — только вызов application-service и `response_model`.

Гайд: [`../../../docs/ADDING_A_FEATURE.md`](../../../docs/ADDING_A_FEATURE.md)
