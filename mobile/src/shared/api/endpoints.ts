import { apiRequest } from '../../shared/api/client';
import type {
  ActivityItem,
  Chat,
  Friend,
  FriendLocation,
  FriendRequest,
  Message,
  NotificationSettings,
  Place,
  PlaceFavorite,
  PrivacySettings,
  UserMe,
  VisibilityOverride,
} from '../../entities/types';

export const authApi = {
  register(payload: { email: string; password: string; username: string }) {
    return apiRequest('/auth/register', { method: 'POST', body: payload, auth: false });
  },
  async login(login: string, password: string) {
    const form = new URLSearchParams();
    form.set('username', login);
    form.set('password', password);
    return apiRequest<{ access_token: string; token_type: string }>('/auth/jwt/login', {
      method: 'POST',
      form,
      auth: false,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  logout() {
    return apiRequest<void>('/auth/jwt/logout', { method: 'POST' });
  },
};

export const profileApi = {
  me() {
    return apiRequest<UserMe>('/profile/me');
  },
  patch(body: Record<string, unknown>) {
    return apiRequest<UserMe>('/profile/me', { method: 'PATCH', body });
  },
  async uploadAvatar(uri: string, fileName = 'avatar.jpg', mime = 'image/jpeg') {
    const form = new FormData();
    form.append('file', { uri, name: fileName, type: mime } as unknown as Blob);
    return apiRequest<UserMe>('/profile/me/avatar', { method: 'POST', form });
  },
  deleteAccount() {
    return apiRequest<void>('/profile/me', { method: 'DELETE' });
  },
  getPrivacy() {
    return apiRequest<PrivacySettings>('/profile/privacy');
  },
  putPrivacy(body: Partial<PrivacySettings>) {
    return apiRequest<PrivacySettings>('/profile/privacy', { method: 'PUT', body });
  },
  getNotifications() {
    return apiRequest<NotificationSettings>('/profile/notification-settings');
  },
  putNotifications(body: Partial<NotificationSettings>) {
    return apiRequest<NotificationSettings>('/profile/notification-settings', { method: 'PUT', body });
  },
  favorites() {
    return apiRequest<PlaceFavorite[]>('/profile/favorite-places');
  },
  addFavorite(place_id: string) {
    return apiRequest<PlaceFavorite>('/profile/favorite-places', { method: 'POST', body: { place_id } });
  },
  removeFavorite(place_id: string) {
    return apiRequest<void>(`/profile/favorite-places/${encodeURIComponent(place_id)}`, {
      method: 'DELETE',
    });
  },
  registerDevice(body: {
    expo_push_token: string;
    platform: 'ios' | 'android' | 'web' | 'unknown';
    device_id?: string;
  }) {
    return apiRequest<{ id: string; platform: string; expo_push_token: string }>(
      '/profile/devices',
      { method: 'POST', body },
    );
  },
  unregisterDevice(body: { expo_push_token?: string; device_id?: string }) {
    return apiRequest<void>('/profile/devices', { method: 'DELETE', body });
  },
};

export const friendsApi = {
  list() {
    return apiRequest<Friend[]>('/friends');
  },
  requests() {
    return apiRequest<FriendRequest[]>('/friends/requests');
  },
  search(q: string, limit = 12) {
    const params = new URLSearchParams({ q, limit: String(limit) });
    return apiRequest<Friend[]>(`/friends/search?${params.toString()}`);
  },
  invite() {
    return apiRequest<{
      username: string;
      deep_link: string;
      web_link: string;
      share_text: string;
    }>('/friends/invite');
  },
  claimInvite(username: string) {
    return apiRequest<Friend>('/friends/invite/claim', {
      method: 'POST',
      body: { username },
    });
  },
  send(payload: { to_username?: string; to_user_id?: string; message?: string }) {
    return apiRequest<FriendRequest>('/friends/requests', { method: 'POST', body: payload });
  },
  accept(id: string) {
    return apiRequest<FriendRequest>(`/friends/requests/${id}/accept`, { method: 'POST' });
  },
  reject(id: string) {
    return apiRequest<FriendRequest>(`/friends/requests/${id}/reject`, { method: 'POST' });
  },
  cancel(id: string) {
    return apiRequest<FriendRequest>(`/friends/requests/${id}/cancel`, { method: 'POST' });
  },
  remove(friendId: string) {
    return apiRequest<void>(`/friends/${friendId}`, { method: 'DELETE' });
  },
  block(userId: string) {
    return apiRequest<void>(`/users/${userId}/block`, { method: 'POST' });
  },
  unblock(userId: string) {
    return apiRequest<void>(`/users/${userId}/block`, { method: 'DELETE' });
  },
  visibility() {
    return apiRequest<VisibilityOverride[]>('/privacy/visibility');
  },
  setVisibility(
    friendId: string,
    body: {
      mode: 'normal' | 'frozen' | 'approximate';
      expires_at?: string | null;
      frozen_lat?: number | null;
      frozen_lon?: number | null;
      approximate_radius_m?: number | null;
    },
  ) {
    return apiRequest<VisibilityOverride>(`/privacy/visibility/${friendId}`, { method: 'PUT', body });
  },
};

export const mapApi = {
  friends() {
    return apiRequest<FriendLocation[]>('/map/friends');
  },
  activity() {
    return apiRequest<ActivityItem[]>('/map/activity');
  },
  places(bbox: string, types?: string, syncOsm = true) {
    const q = new URLSearchParams({ bbox, sync_osm: syncOsm ? 'true' : 'false' });
    if (types) q.set('types', types);
    return apiRequest<Place[]>(`/map/places?${q.toString()}`);
  },
  place(id: string) {
    return apiRequest<Place>(`/map/places/${id}`);
  },
  ensureOsmPlace(body: {
    osm_id: string;
    name: string;
    place_type: string;
    lat: number;
    lon: number;
    address_text?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    return apiRequest<Place>('/map/places/ensure-osm', { method: 'POST', body });
  },
  postLocation(body: {
    lat: number;
    lon: number;
    accuracy_m?: number;
    speed_mps?: number;
    heading_deg?: number;
    battery_percent?: number;
    is_moving?: boolean;
    recorded_at?: string;
  }) {
    return apiRequest('/map/location', { method: 'POST', body });
  },
};

export const chatsApi = {
  list() {
    return apiRequest<Chat[]>('/chats');
  },
  direct(peer_user_id: string) {
    return apiRequest<Chat>('/chats/direct', { method: 'POST', body: { peer_user_id } });
  },
  openPlaceChat(placeId: string) {
    return apiRequest<Chat>(`/places/${placeId}/chat`, { method: 'POST' });
  },
  messages(chatId: string, limit = 50, before_id?: string) {
    const q = new URLSearchParams({ limit: String(limit) });
    if (before_id) q.set('before_id', before_id);
    return apiRequest<Message[]>(`/chats/${chatId}/messages?${q.toString()}`);
  },
  send(
    chatId: string,
    body: string,
    client_message_id?: string,
    attachments?: Array<{
      kind: 'image' | 'video' | 'audio' | 'file';
      url: string;
      mime?: string | null;
      size_bytes?: number | null;
    }>,
    reply_to_id?: string | null,
  ) {
    return apiRequest<Message>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: {
        body,
        client_message_id,
        attachments: attachments ?? [],
        reply_to_id: reply_to_id || undefined,
      },
    });
  },
  react(messageId: string, emoji: string) {
    return apiRequest<Message>(`/messages/${messageId}/reactions`, {
      method: 'POST',
      body: { emoji },
    });
  },
  async uploadMedia(chatId: string, uri: string, fileName: string, mime: string) {
    const form = new FormData();
    if (typeof window !== 'undefined' && (uri.startsWith('blob:') || uri.startsWith('data:') || uri.startsWith('http'))) {
      const res = await fetch(uri);
      const blob = await res.blob();
      form.append('file', blob, fileName);
    } else {
      form.append('file', { uri, name: fileName, type: mime } as unknown as Blob);
    }
    return apiRequest<{
      url: string;
      kind: 'image' | 'video' | 'audio' | 'file';
      mime?: string | null;
      size_bytes?: number | null;
    }>(`/chats/${chatId}/media`, { method: 'POST', form, timeoutMs: 90_000 });
  },
  read(chatId: string, message_id: string) {
    return apiRequest<void>(`/chats/${chatId}/read`, { method: 'POST', body: { message_id } });
  },
  softDelete(messageId: string) {
    return apiRequest<Message>(`/messages/${messageId}`, { method: 'DELETE' });
  },
};
