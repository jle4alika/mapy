import abc
import logging
from typing import Any, Optional, Type

import aio_pika

from infrastructure.rabbitmq.connection import get_rmq_url
from core.logging import get_logger

logger = get_logger(__name__)


class BaseRMQClient(abc.ABC):
    """Асинхронный базовый клиент RabbitMQ на aio-pika."""

    def __init__(
        self,
        queue_name: str,
        exchange: str = "",
        exchange_type: str = "direct",
    ) -> None:
        self.queue_name = queue_name
        self.exchange_name = exchange
        self.exchange_type = exchange_type

        self.connection: Optional[aio_pika.abc.AbstractRobustConnection] = None
        self.channel: Optional[aio_pika.abc.AbstractRobustChannel] = None

    async def connect(self) -> None:
        """Установка соединения и настройка топологии."""
        # Используем connect_robust для автоматического переподключения
        self.connection = await aio_pika.connect_robust(get_rmq_url())
        self.channel = await self.connection.channel()

        logger.info("Connection established. Channel opened.")
        await self._setup_topology()

    async def _setup_topology(self) -> None:
        """Идемпотентное объявление очереди и exchange."""
        # Объявляем очередь
        queue = await self.channel.declare_queue(self.queue_name, durable=True)
        logger.info("Queue declared: %s", self.queue_name)

        if self.exchange_name:
            exchange = await self.channel.declare_exchange(
                name=self.exchange_name,
                type=self.exchange_type,
                durable=True,
            )
            await queue.bind(exchange, routing_key=self.queue_name)
            logger.info(
                "Exchange '%s' (%s) bound to queue '%s'",
                self.exchange_name,
                self.exchange_type,
                self.queue_name,
            )

    async def close(self) -> None:
        """Закрытие ресурсов."""
        if self.connection and not self.connection.is_closed:
            await self.connection.close()
        logger.info("RabbitMQ connection closed.")

    async def __aenter__(self) -> "BaseRMQClient":
        await self.connect()
        return self

    async def __aexit__(
        self,
        exc_type: Optional[Type[BaseException]],
        exc_val: Optional[BaseException],
        exc_tb: Optional[Any],
    ) -> None:
        await self.close()


class BasicRMQPublisher(BaseRMQClient):
    """Публикатор сообщений."""

    async def publish_message(self, message_body: str) -> None:
        """Публикация сообщения (асинхронно)."""
        if not self.channel:
            await self.connect()

        logger.info("Preparing to publish messages: %s", message_body)

        # Если exchange не задан, используем дефолтный (через channel.default_exchange)
        exchange = (
            await self.channel.get_exchange(self.exchange_name)
            if self.exchange_name
            else self.channel.default_exchange
        )

        await exchange.publish(
            aio_pika.Message(
                body=message_body.encode("utf-8"),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            ),
            routing_key=self.queue_name,
        )
        logger.info("Message published to queue %s", self.queue_name)


class BasicRMQConsumer(BaseRMQClient, abc.ABC):
    """Абстрактный потребитель."""

    async def start_consuming(self) -> None:
        """Запуск цикла прослушивания."""
        if not self.channel:
            await self.connect()

        await self.channel.set_qos(prefetch_count=1)
        queue = await self.channel.get_queue(self.queue_name)

        logger.warning("Waiting for messages in queue %s...", self.queue_name)

        # Начинаем потребление через асинхронный контекстный менеджер
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process(requeue=True, ignore_processed=True):
                    # messages.process автоматически сделает ack,
                    # а при исключении — nack с requeue
                    logger.info("Processing messages from queue %s", self.queue_name)
                    await self.handle_payload(message)
                    logger.info("Finished processing messages from queue %s", self.queue_name)

    @abc.abstractmethod
    async def handle_payload(self, message: aio_pika.abc.AbstractIncomingMessage) -> None:
        """Бизнес-логика обработки входящего сообщения."""
        pass
