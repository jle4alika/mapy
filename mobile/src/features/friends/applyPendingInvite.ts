import { friendsApi } from '../../shared/api/endpoints';
import { consumePendingInvite } from './invite-store';

/** После логина/регистрации применяем отложенный инвайт → сразу друзья */
export async function applyPendingFriendInvite(): Promise<boolean> {
  const username = await consumePendingInvite();
  if (!username) return false;
  try {
    await friendsApi.claimInvite(username);
    return true;
  } catch {
    // Если уже друзья / ошибка — не блокируем вход
    return false;
  }
}
