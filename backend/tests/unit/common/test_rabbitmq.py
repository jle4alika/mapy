from __future__ import annotations

from infrastructure.rabbitmq import API_EXCHANGE, QUEUE_MESSAGE_CREATE, get_rmq_url
from infrastructure.rabbitmq.queue_names import API_EXCHANGE as EX


def test_queue_names_defined() -> None:
    assert API_EXCHANGE == EX
    assert QUEUE_MESSAGE_CREATE
    assert get_rmq_url().startswith("amqp://")
