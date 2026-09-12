"""Репозиторий: таблица users → domain.User."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from domains.users.application.ports import AbstractUserRepository
from domains.users.domain.entities import (
    User,
    UserNotificationSettings,
    UserPrivacySettings,
)
from domains.users.infrastructure.models import (
    UserModel,
    UserNotificationSettingsModel,
    UserPrivacySettingsModel,
)
from domains.users.infrastructure.orm_mapper import (
    apply_entity,
    apply_notifications,
    apply_privacy,
    notifications_to_entity,
    privacy_to_entity,
    to_entity,
)


class UserRepository(AbstractUserRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: UUID) -> User | None:
        model = await self._session.get(UserModel, user_id)
        return to_entity(model) if model else None

    async def get_by_email(self, email: str) -> User | None:
        result = await self._session.execute(select(UserModel).where(UserModel.email == email))
        model = result.scalars().one_or_none()
        return to_entity(model) if model else None

    async def get_by_username(self, username: str) -> User | None:
        result = await self._session.execute(
            select(UserModel).where(UserModel.username == username),
        )
        model = result.scalars().one_or_none()
        return to_entity(model) if model else None

    async def search_by_username(
        self,
        query: str,
        *,
        exclude_id: UUID | None = None,
        limit: int = 12,
    ) -> list[User]:
        q = (query or "").strip().lstrip("@")
        if len(q) < 1:
            return []
        stmt = (
            select(UserModel)
            .outerjoin(
                UserPrivacySettingsModel,
                UserPrivacySettingsModel.user_id == UserModel.id,
            )
            .where(
                UserModel.is_active.is_(True),
                UserModel.username.ilike(f"{q}%"),
                or_(
                    UserPrivacySettingsModel.discoverable_in_search.is_(True),
                    UserPrivacySettingsModel.user_id.is_(None),
                ),
            )
            .order_by(UserModel.username.asc())
            .limit(limit)
        )
        if exclude_id is not None:
            stmt = stmt.where(UserModel.id != exclude_id)
        result = await self._session.execute(stmt)
        return [to_entity(m) for m in result.scalars().all()]

    async def is_username_taken(
        self,
        username: str,
        *,
        exclude_id: UUID | None = None,
    ) -> bool:
        query = select(func.count()).select_from(UserModel).where(UserModel.username == username)
        if exclude_id is not None:
            query = query.where(UserModel.id != exclude_id)
        result = await self._session.execute(query)
        return int(result.scalar_one()) > 0

    async def list_active(self, *, limit: int = 50, offset: int = 0) -> list[User]:
        result = await self._session.execute(
            select(UserModel)
            .where(UserModel.is_active.is_(True))
            .order_by(UserModel.created_at.desc())
            .limit(limit)
            .offset(offset),
        )
        return [to_entity(m) for m in result.scalars().all()]

    async def save(self, user: User) -> User:
        model = await self._session.get(UserModel, user.id)
        if model is None:
            raise LookupError(f"User {user.id} not found for save")
        apply_entity(model, user)
        await self._session.flush()
        return to_entity(model)

    async def get_privacy_settings(self, user_id: UUID) -> UserPrivacySettings:
        model = await self._session.get(UserPrivacySettingsModel, user_id)
        if model is None:
            model = UserPrivacySettingsModel(user_id=user_id)
            self._session.add(model)
            await self._session.flush()
        return privacy_to_entity(model)

    async def save_privacy_settings(
        self,
        settings: UserPrivacySettings,
    ) -> UserPrivacySettings:
        model = await self._session.get(UserPrivacySettingsModel, settings.user_id)
        if model is None:
            model = UserPrivacySettingsModel(user_id=settings.user_id)
            self._session.add(model)
        apply_privacy(model, settings)
        await self._session.flush()
        return privacy_to_entity(model)

    async def get_notification_settings(self, user_id: UUID) -> UserNotificationSettings:
        model = await self._session.get(UserNotificationSettingsModel, user_id)
        if model is None:
            model = UserNotificationSettingsModel(user_id=user_id)
            self._session.add(model)
            await self._session.flush()
        return notifications_to_entity(model)

    async def save_notification_settings(
        self,
        settings: UserNotificationSettings,
    ) -> UserNotificationSettings:
        model = await self._session.get(UserNotificationSettingsModel, settings.user_id)
        if model is None:
            model = UserNotificationSettingsModel(user_id=settings.user_id)
            self._session.add(model)
        apply_notifications(model, settings)
        await self._session.flush()
        return notifications_to_entity(model)
