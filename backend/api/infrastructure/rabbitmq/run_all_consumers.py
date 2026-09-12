"""
Точка входа: запуск всех RabbitMQ-консьюмеров сообщений.

Пример:
  PYTHONPATH=.:api python -m infrastructure.rabbitmq.run_all_consumers
"""

from __future__ import annotations

import asyncio

from infrastructure.rabbitmq.consumers.basic_consumer import run_consumer as run_create
from core.logging import get_logger

logger = get_logger(__name__)


async def run_all_message_consumers() -> None:
    await asyncio.gather(
        run_create(),
    )


def main() -> None:
    try:
        asyncio.run(run_all_message_consumers())
    except KeyboardInterrupt:
        logger.info("Остановка консьюмеров.")


if __name__ == "__main__":
    main()
