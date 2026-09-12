import { create } from 'zustand';

import type { UserMe } from '../../entities/types';
import { clearAccessToken, getAccessToken, setAccessToken } from '../../shared/api/token';
import { profileApi } from '../../shared/api/endpoints';

type SessionState = {
  token: string | null;
  user: UserMe | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (token: string, user?: UserMe | null) => Promise<void>;
  refreshMe: () => Promise<UserMe | null>;
  logout: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  token: null,
  user: null,
  hydrated: false,
  async hydrate() {
    const token = await getAccessToken();
    if (!token) {
      set({ token: null, user: null, hydrated: true });
      return;
    }
    // Сразу разблокируем UI — иначе при медленном /me экран вечно пустой
    set({ token, hydrated: true });
    try {
      const user = await profileApi.me();
      set({ user });
    } catch {
      await clearAccessToken();
      set({ token: null, user: null });
    }
  },
  async setSession(token, user = null) {
    await setAccessToken(token);
    set({ token, user });
    if (!user) await get().refreshMe();
  },
  async refreshMe() {
    try {
      const user = await profileApi.me();
      set({ user });
      return user;
    } catch {
      return null;
    }
  },
  async logout() {
    try {
      const { unregisterPushDevice } = await import('../notifications/push');
      await unregisterPushDevice().catch(() => undefined);
      await clearAccessToken();
    } finally {
      const { clearPresenceCaches } = await import('../presence/offline-cache');
      const { useNotificationStore } = await import('../notifications/notification-store');
      await clearPresenceCaches().catch(() => undefined);
      useNotificationStore.getState().clear();
      set({ token: null, user: null });
    }
  },
}));
