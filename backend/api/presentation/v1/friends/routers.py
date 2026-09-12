"""HTTP-ручки друзей и видимости."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from domains.friends.application.dto import (
    FriendDTO,
    FriendRequestDTO,
    InviteInfoDTO,
    VisibilityOverrideDTO,
)
from domains.users.infrastructure.auth import CurrentActiveUser
from presentation.v1.friends.dependencies import FriendsServiceDep

friends_router = APIRouter(prefix="/friends", tags=["friends"])
privacy_router = APIRouter(prefix="/privacy", tags=["privacy"])
blocks_router = APIRouter(prefix="/users", tags=["blocks"])


class SendFriendRequestBody(BaseModel):
    to_user_id: uuid.UUID | None = None
    to_username: str | None = Field(default=None, max_length=32)
    message: str | None = Field(default=None, max_length=500)


class ClaimInviteBody(BaseModel):
    username: str = Field(..., min_length=1, max_length=32)


class SetVisibilityBody(BaseModel):
    mode: Literal["normal", "frozen", "approximate"]
    expires_at: datetime | None = None
    frozen_lat: float | None = None
    frozen_lon: float | None = None
    approximate_radius_m: int | None = Field(default=None, ge=50, le=5000)


@friends_router.get("/invite", response_model=InviteInfoDTO)
async def get_invite(
    user: CurrentActiveUser,
    service: FriendsServiceDep,
) -> InviteInfoDTO:
    return await service.invite_info(user.id)


@friends_router.post("/invite/claim", response_model=FriendDTO)
async def claim_invite(
    body: ClaimInviteBody,
    user: CurrentActiveUser,
    service: FriendsServiceDep,
) -> FriendDTO:
    friend = await service.claim_invite(user.id, inviter_username=body.username)
    from infrastructure.realtime.connection_manager import connection_manager

    await connection_manager.send_json(
        friend.user_id,
        {
            "type": "notification",
            "payload": {
                "kind": "friend_accepted",
                "title": "Новый друг",
                "body": "Кто-то добавился по вашей ссылке",
                "from_user_id": str(user.id),
            },
        },
    )
    return friend


@friends_router.get("/search", response_model=list[FriendDTO])
async def search_users(
    user: CurrentActiveUser,
    service: FriendsServiceDep,
    q: str = Query(default="", max_length=32),
    limit: int = Query(default=12, ge=1, le=30),
) -> list[FriendDTO]:
    return await service.search_users(user.id, query=q, limit=limit)


@friends_router.get("", response_model=list[FriendDTO])
async def list_friends(
    user: CurrentActiveUser,
    service: FriendsServiceDep,
) -> list[FriendDTO]:
    return await service.list_friends(user.id)


@friends_router.get("/requests", response_model=list[FriendRequestDTO])
async def list_requests(
    user: CurrentActiveUser,
    service: FriendsServiceDep,
) -> list[FriendRequestDTO]:
    return await service.list_requests(user.id)


@friends_router.post("/requests", response_model=FriendRequestDTO)
async def send_request(
    body: SendFriendRequestBody,
    user: CurrentActiveUser,
    service: FriendsServiceDep,
) -> FriendRequestDTO:
    dto = await service.send_request(
        user.id,
        to_user_id=body.to_user_id,
        to_username=body.to_username,
        message=body.message,
    )
    from infrastructure.realtime.connection_manager import connection_manager

    await connection_manager.send_json(
        dto.to_user_id,
        {
            "type": "notification",
            "payload": {
                "kind": "friend_request",
                "title": "Заявка в друзья",
                "body": "Вам отправили заявку в друзья",
                "request_id": str(dto.id),
                "from_user_id": str(dto.from_user_id),
            },
        },
    )
    await connection_manager.send_json(
        dto.to_user_id,
        {
            "type": "friend.request",
            "payload": {
                "id": str(dto.id),
                "from_user_id": str(dto.from_user_id),
                "to_user_id": str(dto.to_user_id),
                "status": dto.status,
                "message": dto.message,
            },
        },
    )
    return dto


@friends_router.post("/requests/{request_id}/accept", response_model=FriendRequestDTO)
async def accept_request(
    request_id: uuid.UUID,
    user: CurrentActiveUser,
    service: FriendsServiceDep,
) -> FriendRequestDTO:
    dto = await service.accept(user.id, request_id)
    from infrastructure.realtime.connection_manager import connection_manager

    await connection_manager.send_json(
        dto.from_user_id,
        {
            "type": "notification",
            "payload": {
                "kind": "friend_accepted",
                "title": "Заявка принята",
                "body": "Вас добавили в друзья",
                "request_id": str(dto.id),
                "from_user_id": str(dto.to_user_id),
            },
        },
    )
    return dto


@friends_router.post("/requests/{request_id}/reject", response_model=FriendRequestDTO)
async def reject_request(
    request_id: uuid.UUID,
    user: CurrentActiveUser,
    service: FriendsServiceDep,
) -> FriendRequestDTO:
    return await service.reject(user.id, request_id)


@friends_router.post("/requests/{request_id}/cancel", response_model=FriendRequestDTO)
async def cancel_request(
    request_id: uuid.UUID,
    user: CurrentActiveUser,
    service: FriendsServiceDep,
) -> FriendRequestDTO:
    return await service.cancel(user.id, request_id)


@friends_router.delete("/{friend_id}", status_code=204)
async def remove_friend(
    friend_id: uuid.UUID,
    user: CurrentActiveUser,
    service: FriendsServiceDep,
) -> None:
    await service.remove_friend(user.id, friend_id)


@blocks_router.post("/{user_id}/block", status_code=204)
async def block_user(
    user_id: uuid.UUID,
    user: CurrentActiveUser,
    service: FriendsServiceDep,
) -> None:
    await service.block(user.id, user_id)


@blocks_router.delete("/{user_id}/block", status_code=204)
async def unblock_user(
    user_id: uuid.UUID,
    user: CurrentActiveUser,
    service: FriendsServiceDep,
) -> None:
    await service.unblock(user.id, user_id)


@privacy_router.get("/visibility", response_model=list[VisibilityOverrideDTO])
async def list_visibility(
    user: CurrentActiveUser,
    service: FriendsServiceDep,
) -> list[VisibilityOverrideDTO]:
    return await service.list_visibility(user.id)


@privacy_router.put("/visibility/{friend_id}", response_model=VisibilityOverrideDTO)
async def set_visibility(
    friend_id: uuid.UUID,
    body: SetVisibilityBody,
    user: CurrentActiveUser,
    service: FriendsServiceDep,
) -> VisibilityOverrideDTO:
    return await service.set_visibility(
        user.id,
        friend_id,
        mode=body.mode,
        expires_at=body.expires_at,
        frozen_lat=body.frozen_lat,
        frozen_lon=body.frozen_lon,
        approximate_radius_m=body.approximate_radius_m,
    )
