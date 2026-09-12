from __future__ import annotations

from unittest.mock import MagicMock
from uuid import uuid4

from domains.users.application.service import UserService
from infrastructure.cache.key_builders.db_keybuilder import key_builder


def test_key_stable_across_different_service_instances() -> None:
    user_id = uuid4()
    request = MagicMock()
    request.url.path = f"/api/v1/profile/{user_id}"
    request.query_params.multi_items.return_value = []

    svc1 = UserService(MagicMock())
    svc2 = UserService(MagicMock())

    def endpoint():
        pass

    key1 = key_builder(
        endpoint,
        "get-user",
        request=request,
        kwargs={"user_id": user_id, "service": svc1},
    )
    key2 = key_builder(
        endpoint,
        "get-user",
        request=request,
        kwargs={"user_id": user_id, "service": svc2},
    )
    assert key1 == key2
