import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FriendLocation, Place } from '../../entities/types';

const FRIENDS_KEY = 'mapy_cache_map_friends';
const PLACES_KEY = 'mapy_cache_map_places';
const PLACES_CELL_PREFIX = 'mapy_cache_places_cell:';
const PLACES_CELL_INDEX = 'mapy_cache_places_cells';

/** Ячейка ~0.2° — оффлайн-места по регионам РФ */
export function placesCellKey(lat: number, lon: number): string {
  const latKey = Math.floor(lat * 5);
  const lonKey = Math.floor(lon * 5);
  return `${latKey}:${lonKey}`;
}

function parseBbox(bbox: string): { minLon: number; minLat: number; maxLon: number; maxLat: number } | null {
  const parts = bbox.split(',').map((x) => Number(x.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null;
  return { minLon: parts[0], minLat: parts[1], maxLon: parts[2], maxLat: parts[3] };
}

function cellsForBbox(bbox: string): string[] {
  const b = parseBbox(bbox);
  if (!b) return [];
  const keys = new Set<string>();
  for (let lat = b.minLat; lat <= b.maxLat + 0.01; lat += 0.2) {
    for (let lon = b.minLon; lon <= b.maxLon + 0.01; lon += 0.2) {
      keys.add(placesCellKey(lat, lon));
    }
  }
  keys.add(placesCellKey(b.minLat, b.minLon));
  keys.add(placesCellKey(b.maxLat, b.maxLon));
  return [...keys];
}

export async function cacheFriendsSnapshot(data: FriendLocation[]) {
  await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify({ at: Date.now(), data }));
}

export async function loadFriendsSnapshot(): Promise<FriendLocation[] | null> {
  const raw = await AsyncStorage.getItem(FRIENDS_KEY);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { data: FriendLocation[] }).data;
  } catch {
    return null;
  }
}

/** Глобальный снимок (совместимость) + региональные ячейки для оффлайна */
export async function cachePlacesSnapshot(data: Place[], bbox?: string | null) {
  await AsyncStorage.setItem(PLACES_KEY, JSON.stringify({ at: Date.now(), data }));
  if (!bbox || !data.length) return;

  const byCell = new Map<string, Place[]>();
  for (const p of data) {
    if (p.lat == null || p.lon == null) continue;
    const key = placesCellKey(p.lat, p.lon);
    const list = byCell.get(key) ?? [];
    list.push(p);
    byCell.set(key, list);
  }

  const indexRaw = await AsyncStorage.getItem(PLACES_CELL_INDEX);
  const index = new Set<string>(indexRaw ? (JSON.parse(indexRaw) as string[]) : []);

  for (const [cell, places] of byCell) {
    const storageKey = PLACES_CELL_PREFIX + cell;
    let merged = places;
    try {
      const prevRaw = await AsyncStorage.getItem(storageKey);
      if (prevRaw) {
        const prev = (JSON.parse(prevRaw) as { data: Place[] }).data ?? [];
        const map = new Map<string, Place>();
        for (const p of prev) map.set(p.id, p);
        for (const p of places) map.set(p.id, p);
        merged = [...map.values()];
      }
    } catch {
      // ignore
    }
    // лимит на ячейку, чтобы не раздувать AsyncStorage
    if (merged.length > 2500) merged = merged.slice(-2500);
    await AsyncStorage.setItem(storageKey, JSON.stringify({ at: Date.now(), data: merged }));
    index.add(cell);
  }
  await AsyncStorage.setItem(PLACES_CELL_INDEX, JSON.stringify([...index]));
}

export async function loadPlacesSnapshot(): Promise<Place[] | null> {
  const raw = await AsyncStorage.getItem(PLACES_KEY);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { data: Place[] }).data;
  } catch {
    return null;
  }
}

/** Оффлайн: места из всех ячеек, пересекающих bbox */
export async function loadPlacesForBbox(bbox: string): Promise<Place[]> {
  const cells = cellsForBbox(bbox);
  const map = new Map<string, Place>();
  for (const cell of cells) {
    try {
      const raw = await AsyncStorage.getItem(PLACES_CELL_PREFIX + cell);
      if (!raw) continue;
      const data = (JSON.parse(raw) as { data: Place[] }).data ?? [];
      for (const p of data) map.set(p.id, p);
    } catch {
      // ignore
    }
  }
  if (map.size === 0) {
    const fallback = await loadPlacesSnapshot();
    return fallback ?? [];
  }
  const b = parseBbox(bbox);
  if (!b) return [...map.values()];
  return [...map.values()].filter(
    (p) => p.lat >= b.minLat && p.lat <= b.maxLat && p.lon >= b.minLon && p.lon <= b.maxLon,
  );
}

export async function clearPresenceCaches() {
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter(
    (k) =>
      k === FRIENDS_KEY ||
      k === PLACES_KEY ||
      k === PLACES_CELL_INDEX ||
      k.startsWith(PLACES_CELL_PREFIX),
  );
  await Promise.all(ours.map((k) => AsyncStorage.removeItem(k)));
}
