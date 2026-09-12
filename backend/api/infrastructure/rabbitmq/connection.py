"""Фабрики подключений RabbitMQ (infra, не settings)."""

from __future__ import annotations

import pika

from core.config import settings


def get_rmq_url() -> str:
    """URL для aio-pika: amqp://user:pass@host:port/."""
    return settings.rmq.url


def get_rmq_connection() -> pika.BlockingConnection:
    """Синхронное соединение с RabbitMQ (pika, воркеры/скрипты)."""
    return pika.BlockingConnection(
        pika.ConnectionParameters(
            host=settings.rmq.HOST,
            port=settings.rmq.PORT,
            credentials=pika.PlainCredentials(settings.rmq.LOGIN, settings.rmq.PASS),
        )
    )
