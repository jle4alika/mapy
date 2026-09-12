export type UserMe = {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  status_text?: string | null;
  status_emoji?: string | null;
  last_seen_at?: string | null;
  scheduled_deletion_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UserPublic = {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  status_text?: string | null;
  status_emoji?: string | null;
  last_seen_at?: string | null;
};

export type Friend = {
  user_id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  since?: string | null;
};

export type FriendRequest = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message?: string | null;
  created_at?: string | null;
};

export type VisibilityOverride = {
  viewer_id: string;
  mode: 'normal' | 'frozen' | 'approximate';
  frozen_lat?: number | null;
  frozen_lon?: number | null;
  approximate_radius_m?: number | null;
  expires_at?: string | null;
};

export type FriendLocation = {
  user_id: string;
  lat: number;
  lon: number;
  derived_status: 'moving' | 'stationary' | 'unknown';
  speed_mps?: number | null;
  battery_percent?: number | null;
  recorded_at?: string | null;
  accuracy_mode: 'precise' | 'approximate' | 'stale';
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type ActivityItem = {
  user_id: string;
  username?: string | null;
  derived_status: 'moving' | 'stationary' | 'unknown';
  recorded_at?: string | null;
};

export type Place = {
  id: string;
  source: 'osm' | 'user';
  name: string;
  place_type: string;
  lat: number;
  lon: number;
  address_text?: string | null;
  is_public: boolean;
  osm_id?: string | null;
  creator_id?: string | null;
  metadata?: Record<string, unknown>;
  has_chat: boolean;
  chat_id?: string | null;
  created_at?: string | null;
};

export type PlaceFavorite = {
  place_id: string;
  place?: Place | null;
  created_at?: string | null;
};

export type Chat = {
  id: string;
  kind: 'direct' | 'place';
  last_message_at?: string | null;
  peer_user_id?: string | null;
  place_id?: string | null;
  title?: string | null;
};

export type MessageAttachment = {
  id?: string;
  kind: 'image' | 'video' | 'audio' | 'file';
  url: string;
  mime?: string | null;
  size_bytes?: number | null;
};

export type MessageReaction = {
  emoji: string;
  count: number;
  me?: boolean;
};

export type Message = {
  id: string;
  chat_id: string;
  author_id: string;
  author_username?: string | null;
  author_display_name?: string | null;
  author_avatar_url?: string | null;
  body?: string | null;
  client_message_id?: string | null;
  reply_to_id?: string | null;
  deleted_at?: string | null;
  created_at?: string | null;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
};

export type PrivacySettings = {
  share_precise_location: boolean;
  share_battery: boolean;
  share_speed: boolean;
  discoverable_in_search: boolean;
  show_in_place_chats_as_nearby: boolean;
};

export type NotificationSettings = {
  dm_enabled: boolean;
  friend_requests: boolean;
  place_chat_activity: boolean;
  friend_arrived: boolean;
  system: boolean;
};
