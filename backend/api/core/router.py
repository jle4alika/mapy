"""Совместимость: агрегатор роутеров перенесён в api.v1.router."""

from presentation.v1.router import api_v1_router as main_router

__all__ = ["main_router"]
