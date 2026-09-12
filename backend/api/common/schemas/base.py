"""Базовые Pydantic-схемы."""

from pydantic import BaseModel, ConfigDict


class BaseDTO(BaseModel):
    """Общий DTO с ORM-mode для маппинга из SQLAlchemy."""

    model_config = ConfigDict(from_attributes=True)
