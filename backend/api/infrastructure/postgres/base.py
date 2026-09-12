"""Declarative Base и абстрактный UUIDBase для ORM-моделей."""

from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase

from infrastructure.postgres.mixins import UUIDCreatedUpdatedAtMixin


class Base(DeclarativeBase):
    """Базовый класс ORM-моделей."""

    repr_cols: set[str] = set()
    repr_cols_num: int = 3

    def __repr__(self) -> str:
        cols: list[str] = []
        for idx, col in enumerate(self.__table__.columns.keys()):
            if col in self.repr_cols or idx < self.repr_cols_num:
                cols.append(f"{col}={getattr(self, col)}")
        return f"<{self.__class__.__name__} {', '.join(cols)}>"


class UUIDBase(UUIDCreatedUpdatedAtMixin, Base):
    """Абстрактная модель: UUID + created_at / updated_at."""

    __abstract__ = True
