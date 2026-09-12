/**
 * Карта Mapy: MapLibre + OpenStreetMap через OpenFreeMap (без API-ключа).
 *
 * Светлая тема (day) = Positron — спокойный light-gray, как на лендинге.
 * Переопределение:
 * - EXPO_PUBLIC_MAP_STYLE_URL — внешний style JSON URL
 * - EXPO_PUBLIC_MAP_TILES_URL — raster fallback
 */

export const MAP_STYLE_URL = process.env.EXPO_PUBLIC_MAP_STYLE_URL?.trim() || null;

export const MAP_TILES_URL = process.env.EXPO_PUBLIC_MAP_TILES_URL?.trim() || null;

/** Light gray OSM — визуально близко к Esri Canvas Light Gray на лендинге */
export const MAP_STYLE_POSITRON = 'https://tiles.openfreemap.org/styles/positron';

export const MAP_STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

export const MAP_STYLE_LIBERTY = 'https://tiles.openfreemap.org/styles/liberty';

/** @deprecated alias — раньше кастомная сборка от positron */
export const MAP_OPENFREEMAP_BASE = MAP_STYLE_POSITRON;

export const MAP_ATTRIBUTION = '© OpenStreetMap © OpenFreeMap';

export const MAP_CANVAS_BG = '#E8EAED';

/** Свои JSON-темы не используем, если нет env-override */
export const USE_BUNDLED_MAP_THEME = !MAP_STYLE_URL && !MAP_TILES_URL;
