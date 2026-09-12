"""Фоновые задачи Celery. Импортируйте модули задач здесь, чтобы они регистрировались."""

from infrastructure.celery_workers.tasks import example as example  # noqa: F401
from infrastructure.celery_workers.tasks import maintenance as maintenance  # noqa: F401

__all__ = ["example", "maintenance"]
