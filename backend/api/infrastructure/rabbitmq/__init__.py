"""Имена exchange/очередей и фабрики подключений."""

from infrastructure.rabbitmq.connection import get_rmq_connection, get_rmq_url
from infrastructure.rabbitmq.queue_names import API_EXCHANGE, QUEUE_MESSAGE_CREATE

__all__ = [
    "API_EXCHANGE",
    "QUEUE_MESSAGE_CREATE",
    "get_rmq_connection",
    "get_rmq_url",
]
