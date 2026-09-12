"""
Зависимость FastAPI: асинхронная сессия SQLAlchemy на один HTTP-запрос.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.postgres.session import get_session

# Имя в стиле dependency alias (pylint: invalid-name допустим для Annotated-алиаса)
db_sessions = Annotated[AsyncSession, Depends(get_session)]
