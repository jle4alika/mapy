"""Юнит-тесты сообщений чата."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from domains.chats.domain.entities import Message
from domains.chats.domain.errors import InvalidMessageError


def test_message_body_required() -> None:
    with pytest.raises(InvalidMessageError):
        Message.create(
            id=uuid4(),
            chat_id=uuid4(),
            author_id=uuid4(),
            body="   ",
        )


def test_message_ok() -> None:
    author = uuid4()
    msg = Message.create(
        id=uuid4(),
        chat_id=uuid4(),
        author_id=author,
        body="Очередь на заправке 10 минут",
        client_message_id=uuid4(),
    )
    assert msg.body.startswith("Очередь")
    msg.soft_delete(by_user_id=author, when=datetime.now(UTC).replace(tzinfo=None))
    assert msg.deleted_at is not None
