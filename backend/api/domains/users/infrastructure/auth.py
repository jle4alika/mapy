"""
fastapi-users authentication backends (anti-corruption / ACL).

JWT + Cookie. Current-user dependencies для HTTP-слоя.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    CookieTransport,
    JWTStrategy,
)

from core.config import settings
from domains.users.infrastructure.manager import get_user_manager
from domains.users.infrastructure.models import UserModel

bearer_transport = BearerTransport(tokenUrl="api/v1/auth/jwt/login")

cookie_transport = CookieTransport(
    cookie_name="fastapiusersauth",
    cookie_max_age=settings.jwt.lifetime_seconds,
    cookie_httponly=True,
    cookie_secure=settings.is_production,
    cookie_samesite="lax",
)


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=settings.jwt.SECRET_KEY,
        lifetime_seconds=settings.jwt.lifetime_seconds,
    )


auth_backend_jwt = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

auth_backend_cookie = AuthenticationBackend(
    name="cookie",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[UserModel, uuid.UUID](
    get_user_manager,
    [auth_backend_jwt, auth_backend_cookie],
)

current_user = fastapi_users.current_user()
current_active_user = fastapi_users.current_user(active=True)
current_superuser = fastapi_users.current_user(active=True, superuser=True)
current_verified_user = fastapi_users.current_user(active=True, verified=True)

CurrentUser = Annotated[UserModel, Depends(current_user)]
CurrentActiveUser = Annotated[UserModel, Depends(current_active_user)]
CurrentSuperuser = Annotated[UserModel, Depends(current_superuser)]
CurrentVerifiedUser = Annotated[UserModel, Depends(current_verified_user)]
