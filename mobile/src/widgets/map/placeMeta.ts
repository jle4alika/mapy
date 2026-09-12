import type { IconName } from '../../shared/ui/Icon';

/** Подписи, цвета и иконки категорий мест — без голого «Место» */
export const PLACE_TYPE_META: Record<
  string,
  { label: string; color: string; short: string; letter: string; icon: IconName }
> = {
  cafe: { label: 'Кафе', color: '#E67E22', short: 'кафе', letter: 'К', icon: 'cafe' },
  gas_station: { label: 'АЗС', color: '#2E7D32', short: 'АЗС', letter: 'А', icon: 'gas' },
  shop: { label: 'Магазин', color: '#0066FF', short: 'магазин', letter: 'М', icon: 'shop' },
  transit: { label: 'Транспорт', color: '#1565C0', short: 'транспорт', letter: 'Т', icon: 'transit' },
  park: { label: 'Парк', color: '#43A047', short: 'парк', letter: 'П', icon: 'park' },
  custom: { label: 'Точка', color: '#5C6B7A', short: 'точка', letter: '·', icon: 'pin' },
  home: { label: 'Дом', color: '#C62828', short: 'дом', letter: 'Д', icon: 'home' },
};

/** Теги OSM / плейсхолдеры — не реальные названия */
const GENERIC_NAMES = new Set([
  '',
  'место',
  'место osm',
  'без названия',
  'точка',
  'точка на карте',
  'custom',
  'poi',
  'place',
  'unnamed',
  'unknown',
  'yes',
  'no',
  'null',
  'магазин',
  'кафе',
  'остановка',
  'азс',
  'парк',
  'cafe',
  'restaurant',
  'fast_food',
  'bar',
  'pub',
  'shop',
  'supermarket',
  'convenience',
  'pharmacy',
  'bakery',
  'fuel',
  'parking',
  'park',
  'hotel',
  'museum',
  'atm',
  'bank',
  'school',
  'hospital',
  'library',
  'cinema',
  'theatre',
  'theater',
  'bus_stop',
  'station',
  'subway',
  'tram',
  'ferry_terminal',
  'hairdresser',
  'car_repair',
  'clothes',
  'florist',
]);

const ASCII_SLUG_RE = /^[a-z][a-z0-9_]{0,40}$/;

export function isGenericPlaceName(name: string | null | undefined): boolean {
  const raw = (name || '').trim();
  if (!raw) return true;
  const low = raw.toLowerCase();
  if (GENERIC_NAMES.has(low)) return true;
  // cafe / car_repair / seafood — тег типа, не вывеска
  if (raw === low && ASCII_SLUG_RE.test(raw)) return true;
  return false;
}

export function placeTypeLabel(type: string): string {
  return PLACE_TYPE_META[type]?.label ?? 'Точка';
}

export function placeTypeColor(type: string): string {
  return PLACE_TYPE_META[type]?.color ?? '#5C6B7A';
}

export function placeTypeLetter(type: string): string {
  return PLACE_TYPE_META[type]?.letter ?? '·';
}

export function placeTypeIcon(type: string): IconName {
  return PLACE_TYPE_META[type]?.icon ?? 'pin';
}

/** Имя для UI: не показываем плейсхолдеры и OSM-теги вроде «cafe» */
export function placeDisplayName(name: string | null | undefined, placeType: string): string {
  if (isGenericPlaceName(name)) {
    return placeTypeLabel(placeType);
  }
  return (name || '').trim();
}
