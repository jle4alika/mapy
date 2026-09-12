from __future__ import annotations

from unittest.mock import MagicMock

from core.config import settings
from infrastructure.redis.rate_limiter import _client_ip


def test_client_ip_ignores_xff_when_untrusted(monkeypatch) -> None:
    monkeypatch.setattr(settings, "TRUST_PROXY_HEADERS", False)
    request = MagicMock()
    request.headers = {"x-forwarded-for": "1.2.3.4"}
    request.client.host = "10.0.0.1"
    assert _client_ip(request) == "10.0.0.1"


def test_client_ip_uses_xff_when_trusted(monkeypatch) -> None:
    monkeypatch.setattr(settings, "TRUST_PROXY_HEADERS", True)
    request = MagicMock()
    request.headers = {"x-forwarded-for": "1.2.3.4, 9.9.9.9"}
    request.client.host = "10.0.0.1"
    assert _client_ip(request) == "1.2.3.4"
