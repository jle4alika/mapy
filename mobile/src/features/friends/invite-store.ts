import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mapy.pending_friend_invite';

/** Сохраняем ник пригласившего до регистрации / логина */
export async function savePendingInvite(username: string): Promise<void> {
  const clean = username.trim().replace(/^@/, '');
  if (!clean) return;
  await AsyncStorage.setItem(KEY, clean);
}

export async function peekPendingInvite(): Promise<string | null> {
  const v = await AsyncStorage.getItem(KEY);
  return v?.trim() || null;
}

export async function consumePendingInvite(): Promise<string | null> {
  const v = await peekPendingInvite();
  if (v) await AsyncStorage.removeItem(KEY);
  return v;
}

export async function clearPendingInvite(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
