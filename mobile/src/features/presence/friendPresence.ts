import type { FriendLocation } from '../../entities/types';

/** Короткий статус друга для карты / чата (скорость + режим). */
export function formatFriendPresence(friend: Pick<
  FriendLocation,
  'speed_mps' | 'derived_status' | 'accuracy_mode'
> | null | undefined): string {
  if (!friend) return 'Нет на карте';
  const mode = friend.accuracy_mode ?? 'precise';
  const status = friend.derived_status ?? 'unknown';
  const mps = friend.speed_mps;

  if (mode === 'stale') return 'Давно не обновлялся';
  if (mps != null && mps >= 0.4) {
    let kmh = Math.round(mps * 3.6);
    if (kmh < 1) kmh = 1;
    if (kmh < 8) return `${kmh} км/ч · идёт`;
    if (kmh < 25) return `${kmh} км/ч · бежит`;
    return `${kmh} км/ч · едет`;
  }
  if (status === 'moving') return 'В пути';
  if (status === 'stationary') return 'На месте';
  return 'В сети';
}

export function friendPresenceClickable(
  friend: Pick<FriendLocation, 'lat' | 'lon'> | null | undefined,
): boolean {
  return !!friend && friend.lat != null && friend.lon != null;
}
