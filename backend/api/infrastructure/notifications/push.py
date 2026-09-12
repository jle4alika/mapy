"""Доставка in-app (WS) + Expo Push с учётом настроек пользователя."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID, uuid4

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import get_logger
from domains.users.infrastructure.models import UserDeviceModel, UserNotificationSettingsModel
from infrastructure.postgres.session import session_maker
from infrastructure.realtime.connection_manager import connection_manager

logger = get_logger(__name__)

PreferenceKey = Literal[
    "dm_enabled",
    "friend_requests",
    "place_chat_activity",
    "friend_arrived",
    "system",
]

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


async def upsert_device(
    session: AsyncSession,
    *,
    user_id: UUID,
    expo_push_token: str,
    platform: str,
    device_id: str | None,
) -> UserDeviceModel:
    token = expo_push_token.strip()
    result = await session.execute(
        select(UserDeviceModel).where(UserDeviceModel.expo_push_token == token),
    )
    row = result.scalars().one_or_none()
    now = _now()
    if row is None:
        row = UserDeviceModel(
            id=uuid4(),
            user_id=user_id,
            expo_push_token=token,
            platform=(platform or "unknown")[:16],
            device_id=(device_id[:128] if device_id else None),
            created_at=now,
            updated_at=now,
        )
        session.add(row)
    else:
        row.user_id = user_id
        row.platform = (platform or row.platform or "unknown")[:16]
        if device_id:
            row.device_id = device_id[:128]
        row.updated_at = now
    await session.commit()
    await session.refresh(row)
    return row


async def remove_device(
    session: AsyncSession,
    *,
    user_id: UUID,
    expo_push_token: str | None = None,
    device_id: str | None = None,
) -> int:
    stmt = delete(UserDeviceModel).where(UserDeviceModel.user_id == user_id)
    if expo_push_token:
        stmt = stmt.where(UserDeviceModel.expo_push_token == expo_push_token.strip())
    elif device_id:
        stmt = stmt.where(UserDeviceModel.device_id == device_id)
    result = await session.execute(stmt)
    await session.commit()
    return int(result.rowcount or 0)


async def _preference_enabled(
    session: AsyncSession,
    user_id: UUID,
    preference: PreferenceKey,
) -> bool:
    model = await session.get(UserNotificationSettingsModel, user_id)
    if model is None:
        return True
    return bool(getattr(model, preference, True))


async def _tokens_for_users(session: AsyncSession, user_ids: list[UUID]) -> dict[UUID, list[str]]:
    if not user_ids:
        return {}
    result = await session.execute(
        select(UserDeviceModel).where(UserDeviceModel.user_id.in_(user_ids)),
    )
    out: dict[UUID, list[str]] = {uid: [] for uid in user_ids}
    for row in result.scalars().all():
        out.setdefault(row.user_id, []).append(row.expo_push_token)
    return out


async def _send_expo_push(
    tokens: list[str],
    *,
    title: str,
    body: str,
    data: dict[str, Any],
) -> list[str]:
    """Возвращает токены, которые стоит удалить (DeviceNotRegistered)."""
    if not tokens:
        return []
    messages = [
        {
            "to": token,
            "title": title,
            "body": body,
            "sound": "default",
            "data": data,
            "priority": "high",
            "channelId": "mapy-default",
        }
        for token in tokens
    ]
    dead: list[str] = []
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            # Expo принимает батчи до 100
            for i in range(0, len(messages), 100):
                chunk = messages[i : i + 100]
                resp = await client.post(
                    EXPO_PUSH_URL,
                    json=chunk,
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                    },
                )
                if resp.status_code >= 400:
                    logger.warning("expo_push_http status=%s body=%s", resp.status_code, resp.text[:300])
                    continue
                payload = resp.json()
                for idx, item in enumerate(payload.get("data") or []):
                    if not isinstance(item, dict):
                        continue
                    if item.get("status") == "error":
                        details = item.get("details") or {}
                        err = details.get("error") if isinstance(details, dict) else None
                        if err == "DeviceNotRegistered" and i + idx < len(tokens):
                            dead.append(chunk[idx]["to"])
                        logger.info("expo_push_error to=%s msg=%s", chunk[idx]["to"][:24], item.get("message"))
    except Exception:
        logger.exception("expo_push_failed")
    return dead


async def _prune_tokens(session: AsyncSession, tokens: list[str]) -> None:
    if not tokens:
        return
    await session.execute(
        delete(UserDeviceModel).where(UserDeviceModel.expo_push_token.in_(tokens)),
    )
    await session.commit()


async def deliver_app_notification(
    user_ids: list[UUID] | UUID,
    *,
    preference: PreferenceKey,
    kind: str,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> None:
    """
    WS-уведомление + Expo Push для получателей с включённой preference.
    Ошибки push не роняют HTTP-запрос.
    """
    ids = [user_ids] if isinstance(user_ids, UUID) else list({*user_ids})
    if not ids:
        return
    payload = {
        "kind": kind,
        "title": title,
        "body": body,
        **(data or {}),
    }
    frame = {"type": "notification", "payload": payload}

    async with session_maker() as session:
        allowed: list[UUID] = []
        for uid in ids:
            if await _preference_enabled(session, uid, preference):
                allowed.append(uid)
        if not allowed:
            return

        for uid in allowed:
            try:
                await connection_manager.send_json(uid, frame)
            except Exception:
                logger.exception("ws_notify_failed user_id=%s", uid)

        token_map = await _tokens_for_users(session, allowed)
        flat: list[str] = []
        for toks in token_map.values():
            flat.extend(toks)
        # Expo tokens only (ExponentPushToken[...] / ExpoPushToken[...])
        flat = [t for t in flat if "ExpoPushToken[" in t or "ExponentPushToken[" in t]
        dead = await _send_expo_push(flat, title=title, body=body, data=payload)
        if dead:
            await _prune_tokens(session, dead)
