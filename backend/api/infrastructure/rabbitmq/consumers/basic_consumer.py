"""
Пример RabbitMQ consumer (шаблон).

Подключите свою бизнес-логику в handle_payload.
"""

from __future__ import annotations

import json

import aio_pika

from infrastructure.rabbitmq.base import BasicRMQConsumer
from infrastructure.rabbitmq.queue_names import API_EXCHANGE, QUEUE_MESSAGE_CREATE
from core.logging import get_logger

logger = get_logger(__name__)


class ExampleConsumer(BasicRMQConsumer):
    """Обработчик сообщений из очереди (заглушка для расширения)."""

    async def handle_payload(
        self,
        message: aio_pika.abc.AbstractIncomingMessage,
    ) -> None:
        raw = json.loads(message.body.decode("utf-8"))
        logger.info("Получено сообщение: %s", raw)


async def run_consumer() -> None:
    """Запуск consumer в отдельном процессе."""

    async with ExampleConsumer(
        queue_name=QUEUE_MESSAGE_CREATE,
        exchange=API_EXCHANGE,
        exchange_type="direct",
    ) as consumer:
        await consumer.start_consuming()
