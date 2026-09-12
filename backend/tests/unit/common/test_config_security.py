from __future__ import annotations

import pytest
from pydantic import ValidationError

from core.config import JWTSettings, Settings, _DEFAULT_JWT_SECRET
from domains.users.infrastructure import auth


def test_production_rejects_default_jwt_secret() -> None:
    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT="production",
            jwt=JWTSettings(SECRET_KEY=_DEFAULT_JWT_SECRET),
        )


def test_cookie_secure_matches_environment_at_import() -> None:
    assert Settings().is_production is False
    assert auth.cookie_transport.cookie_secure is False
