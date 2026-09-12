"""Celery workers: приложение и задачи для фоновых джоб."""

from infrastructure.celery_workers.celery_app import celery_app

__all__ = ["celery_app"]
