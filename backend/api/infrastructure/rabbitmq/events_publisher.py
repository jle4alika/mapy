from __future__ import annotations

import json
from typing import Any

from infrastructure.rabbitmq.base import BasicRMQPublisher
from infrastructure.rabbitmq.queue_names import API_EXCHANGE
from core.logging import get_logger

logger = get_logger(__name__)


async def publish_api_event(queue_name: str, payload: dict[str, Any]) -> None:
    """
    Публикует JSON-событие в exchange `fastapi.api` с routing_key = имя очереди.
    Не падает наружу: ошибки логируются (HTTP-ответ уже отправлен клиенту).
    """
    try:
        async with BasicRMQPublisher(
            queue_name=queue_name,
            exchange=API_EXCHANGE,
            exchange_type="direct",
        ) as publisher:
            await publisher.publish_message(json.dumps(payload, default=str))
    except Exception:
        logger.exception("Не удалось отправить событие в RabbitMQ queue=%s", queue_name)
