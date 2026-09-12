"""
Точка входа FastAPI: lifespan, middlewares, роутеры.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator

from presentation.v1.router import api_v1_router
from common.exceptions.base_handler import (
    app_error_handler,
    global_500_handler,
    http_exception_handler,
    integrity_error_handler,
    not_found_handler,
    operational_error_handler,
    request_validation_handler,
    sqlalchemy_error_handler,
)
from common.exceptions.errors import AppError, NotFoundError
from core.config import settings
from core.logging import configure_logging, get_logger
from domains.users.infrastructure.auth import (
    auth_backend_cookie,
    auth_backend_jwt,
    fastapi_users,
)
from domains.users.infrastructure.auth_schemas import (
    UserCreate,
    UserRead,
    UserUpdate,
)
from infrastructure.dependencies.rate_limiter import rate_limiter_factory
from infrastructure.postgres.schema_bootstrap import bootstrap_schema
from infrastructure.redis.rate_limiter import rate_limit_middleware, redis_lifespan
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import DBAPIError, IntegrityError, OperationalError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with redis_lifespan(app):
        await bootstrap_schema()
        yield


app = FastAPI(
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    title="Mapy",
    description="Друзья на карте в реальном времени и чаты по местам",
)

# CORS снаружи rate-limit — иначе браузерный Expo web не достучится до /auth/*
_cors_origins = settings.cors_origin_list
if _cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.middleware("http")(rate_limit_middleware)

# Порядок: сначала узкие типы, потом AppError, потом Exception
app.add_exception_handler(NotFoundError, not_found_handler)
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, request_validation_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(OperationalError, operational_error_handler)
app.add_exception_handler(DBAPIError, operational_error_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)
app.add_exception_handler(Exception, global_500_handler)
_storage_root = Path(settings.storage.ROOT)
_storage_root.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(_storage_root)), name="media")


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}

API_V1_PREFIX = "/api/v1"

app.include_router(
    fastapi_users.get_auth_router(auth_backend_jwt),
    prefix=f"{API_V1_PREFIX}/auth/jwt",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_auth_router(auth_backend_cookie),
    prefix=f"{API_V1_PREFIX}/auth/cookie",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix=f"{API_V1_PREFIX}/auth",
    tags=["auth"],
    dependencies=[Depends(rate_limiter_factory("register", 10, 3600))],
)
app.include_router(
    fastapi_users.get_reset_password_router(),
    prefix=f"{API_V1_PREFIX}/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix=f"{API_V1_PREFIX}/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix=f"{API_V1_PREFIX}/users",
    tags=["users"],
)

app.include_router(api_v1_router, prefix=API_V1_PREFIX)

Instrumentator(
    should_group_status_codes=False,
    should_ignore_untemplated=True,
    excluded_handlers=["/metrics", "/health"],
).instrument(app).expose(app, include_in_schema=False)


if __name__ == "__main__":
    uvicorn.run(
        "api.app:app",
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
