from __future__ import annotations

from infrastructure.celery_workers.celery_app import celery_app
from infrastructure.celery_workers.tasks.example import add, ping


def test_celery_app_configured() -> None:
    assert celery_app.main
    assert ping.name


def test_add_task_eager(monkeypatch) -> None:
    from core.config import settings

    monkeypatch.setattr(settings.celery, "TASK_ALWAYS_EAGER", True)
    celery_app.conf.task_always_eager = True
    assert add.run(2, 3) == 5
