from fastapi import APIRouter

from presentation.v1.users.routers import router as users_profile_router
from presentation.v1.friends.routers import (
    blocks_router,
    friends_router,
    privacy_router,
)
from presentation.v1.location.routers import map_router
from presentation.v1.places.routers import favorites_router, map_places_router
from presentation.v1.chats.routers import chats_router, messages_router, place_chat_router
from presentation.v1.map_packs.routers import offline_packs_router
from presentation.v1.realtime.ws import router as ws_router

api_v1_router = APIRouter()
# favorites до profile: иначе /profile/{user_id} перехватывает /profile/favorite-places
api_v1_router.include_router(favorites_router)
api_v1_router.include_router(users_profile_router)
api_v1_router.include_router(friends_router)
api_v1_router.include_router(privacy_router)
api_v1_router.include_router(blocks_router)
api_v1_router.include_router(map_router)
api_v1_router.include_router(map_places_router)
api_v1_router.include_router(chats_router)
api_v1_router.include_router(place_chat_router)
api_v1_router.include_router(messages_router)
api_v1_router.include_router(offline_packs_router)
api_v1_router.include_router(ws_router)
