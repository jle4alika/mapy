from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from domains.users.application.mappers import UserMapper
from tests.seeder import make_user


def test_to_public_excludes_email() -> None:
    user = make_user(username="bob")
    user.created_at = datetime(2024, 5, 1)
    dto = UserMapper.to_public(user)
    assert dto.username == "bob"
    assert dto.created_at == datetime(2024, 5, 1)
    assert "email" not in dto.model_dump()


def test_to_me_includes_security_flags() -> None:
    user = make_user(
        username="admin",
        is_superuser=True,
        is_verified=True,
    )
    user.id = uuid4()
    dto = UserMapper.to_me(user)
    assert dto.email == user.email
    assert dto.is_superuser is True
    assert dto.is_verified is True
