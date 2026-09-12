import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { useSessionStore } from '../auth/session-store';
import {
  parseNotificationData,
  registerPushDevice,
  unregisterPushDevice,
} from './push';

/**
 * После логина: запрос разрешения + регистрация Expo-токена.
 * Тап по пушу → открытие чата / друзей.
 */
export function usePushBootstrap() {
  const token = useSessionStore((s) => s.token);
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      void unregisterPushDevice();
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) void registerPushDevice();
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = parseNotificationData(response);
      if (!data) return;
      if (data.chat_id) {
        router.push(`/(main)/chats/${data.chat_id}`);
        return;
      }
      if (data.kind === 'friend_request' || data.kind === 'friend_accepted') {
        router.push('/(main)/friends');
      }
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      const data = parseNotificationData(response);
      if (!data?.chat_id) return;
      router.push(`/(main)/chats/${data.chat_id}`);
    });

    return () => sub.remove();
  }, [router]);
}
