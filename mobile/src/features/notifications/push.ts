import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { profileApi } from '../../shared/api/endpoints';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

let cachedToken: string | null = null;
let androidChannelReady = false;

function projectId(): string | undefined {
  const eas = Constants.easConfig?.projectId;
  const extra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
    ?.projectId;
  return eas || extra || process.env.EXPO_PUBLIC_EAS_PROJECT_ID || undefined;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || androidChannelReady) return;
  await Notifications.setNotificationChannelAsync('mapy-default', {
    name: 'Mapy',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 100, 180],
    lightColor: '#0066FF',
  });
  androidChannelReady = true;
}

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') return 'unavailable';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'undetermined';
  }
  if (!Device.isDevice && Platform.OS !== 'web') {
    // Эмулятор: разрешения можно запросить, токен часто недоступен
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (current.status === 'denied') return 'denied';
  return 'undetermined';
}

/** Запрос разрешения у ОС (нативный + web Notification API). */
export async function requestPushPermission(): Promise<PushPermissionStatus> {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') return 'unavailable';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    const result = await Notification.requestPermission();
    return result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'undetermined';
  }

  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  const asked = await Notifications.requestPermissionsAsync();
  if (asked.granted) return 'granted';
  if (asked.status === 'denied') return 'denied';
  return 'undetermined';
}

export async function getExpoPushTokenSafe(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    await ensureAndroidChannel();
    const pid = projectId();
    const token = await Notifications.getExpoPushTokenAsync(
      pid ? { projectId: pid } : undefined,
    );
    cachedToken = token.data;
    return cachedToken;
  } catch {
    return null;
  }
}

export async function registerPushDevice(): Promise<{
  status: PushPermissionStatus;
  token: string | null;
}> {
  const status = await requestPushPermission();
  if (status !== 'granted') {
    return { status, token: null };
  }

  if (Platform.OS === 'web') {
    // Web: браузерные Notification; Expo push token на web обычно недоступен.
    return { status, token: null };
  }

  const token = await getExpoPushTokenSafe();
  if (!token) return { status, token: null };

  const platform =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown';
  try {
    await profileApi.registerDevice({
      expo_push_token: token,
      platform,
      device_id: Constants.sessionId || Device.modelId || undefined,
    });
  } catch {
    // токен всё равно вернём — повторная регистрация при следующем входе
  }
  return { status, token };
}

export async function unregisterPushDevice(): Promise<void> {
  const token = cachedToken || (await getExpoPushTokenSafe());
  if (!token) return;
  try {
    await profileApi.unregisterDevice({ expo_push_token: token });
  } catch {
    // ignore
  }
  cachedToken = null;
}

export function parseNotificationData(
  response: Notifications.NotificationResponse | null,
): { chat_id?: string; kind?: string } | null {
  if (!response) return null;
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  if (!data) return null;
  return {
    chat_id: typeof data.chat_id === 'string' ? data.chat_id : undefined,
    kind: typeof data.kind === 'string' ? data.kind : undefined,
  };
}
