import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import type { FriendLocation, Place } from '../../entities/types';
import { mediaUrl } from '../../shared/config/env';
import {
  MAP_ATTRIBUTION,
  MAP_STYLE_DARK,
  MAP_STYLE_LIBERTY,
  MAP_STYLE_POSITRON,
  MAP_STYLE_URL,
  MAP_TILES_URL,
} from '../../shared/config/mapStyle';
import { useTheme } from '../../shared/ui/ThemeProvider';
import type { ThemeId } from '../../shared/ui/theme';
import { PLACE_TYPE_META } from './placeMeta';

export type MapMarkerFriend = FriendLocation;
export type MapMarkerPlace = Place;

type Props = {
  center: { lat: number; lon: number };
  zoom: number;
  myLocation?: { lat: number; lon: number } | null;
  friends?: MapMarkerFriend[];
  places?: MapMarkerPlace[];
  /** IDs избранных — всегда на карте, жёлтая звезда */
  favoriteIds?: string[];
  onRegionChange?: (bbox: string, center: { lat: number; lon: number }, zoom: number) => void;
  onFriendPress?: (friend: MapMarkerFriend) => void;
  onPlacePress?: (place: MapMarkerPlace) => void;
  onOsmPoiPress?: (poi: {
    osm_id: string;
    name: string;
    place_type: string;
    lat: number;
    lon: number;
  }) => void;
};

/** OpenFreeMap (OSM): day = Positron как на лендинге */
const OPENFREEMAP_BY_THEME: Record<ThemeId, string> = {
  day: MAP_STYLE_POSITRON,
  midnight: MAP_STYLE_DARK,
  aurora: MAP_STYLE_LIBERTY,
};

const TYPE_LETTER: Record<string, string> = {
  cafe: 'C',
  gas_station: 'G',
  shop: 'S',
  transit: 'M',
  park: 'P',
  custom: '·',
};

const OMT_CLASS_TO_TYPE: Record<string, string> = {
  // еда
  cafe: 'cafe',
  restaurant: 'cafe',
  fast_food: 'cafe',
  bar: 'cafe',
  pub: 'cafe',
  biergarten: 'cafe',
  food_court: 'cafe',
  ice_cream: 'cafe',
  wine_bar: 'cafe',
  // заправки
  fuel: 'gas_station',
  charging_station: 'gas_station',
  // магазины / услуги
  shop: 'shop',
  supermarket: 'shop',
  convenience: 'shop',
  mall: 'shop',
  clothes: 'shop',
  bakery: 'shop',
  pharmacy: 'shop',
  bookstore: 'shop',
  department_store: 'shop',
  grocery: 'shop',
  greengrocer: 'shop',
  marketplace: 'shop',
  alcohol: 'shop',
  wine: 'shop',
  butcher: 'shop',
  florist: 'shop',
  furniture: 'shop',
  electronics: 'shop',
  hardware: 'shop',
  jewelry: 'shop',
  optician: 'shop',
  shoes: 'shop',
  gift: 'shop',
  sports: 'shop',
  stationery: 'shop',
  toys: 'shop',
  laundry: 'shop',
  hairdresser: 'shop',
  beauty: 'shop',
  office: 'shop',
  bank: 'shop',
  atm: 'shop',
  post: 'shop',
  post_office: 'shop',
  hospital: 'shop',
  clinic: 'shop',
  doctors: 'shop',
  dentist: 'shop',
  veterinary: 'shop',
  hotel: 'shop',
  hostel: 'shop',
  motel: 'shop',
  guest_house: 'shop',
  lodging: 'shop',
  town_hall: 'shop',
  townhall: 'shop',
  police: 'shop',
  fire_station: 'shop',
  embassy: 'shop',
  // транспорт
  bus: 'transit',
  bus_stop: 'transit',
  bus_station: 'transit',
  rail: 'transit',
  railway: 'transit',
  station: 'transit',
  halt: 'transit',
  subway: 'transit',
  subway_entrance: 'transit',
  tram: 'transit',
  tram_stop: 'transit',
  ferry: 'transit',
  ferry_terminal: 'transit',
  airport: 'transit',
  aerodrome: 'transit',
  aerialway: 'transit',
  parking: 'transit',
  bicycle_parking: 'transit',
  // парки / культура / отдых
  park: 'park',
  garden: 'park',
  pitch: 'park',
  playground: 'park',
  nature_reserve: 'park',
  forest: 'park',
  school: 'park',
  college: 'park',
  university: 'park',
  library: 'park',
  community_centre: 'park',
  place_of_worship: 'park',
  attraction: 'park',
  museum: 'park',
  theatre: 'park',
  theater: 'park',
  cinema: 'park',
  arts_centre: 'park',
  monument: 'park',
  memorial: 'park',
  artwork: 'park',
  fountain: 'park',
  viewpoint: 'park',
  zoo: 'park',
  aquarium: 'park',
  castle: 'park',
  ruins: 'park',
  stadium: 'park',
  sports_centre: 'park',
  swimming_pool: 'park',
  golf_course: 'park',
};

/** MapLibre match: class/subclass OSM → цвет категории (серый только для неизвестных) */
function buildOmtClassColorExpr(): unknown[] {
  const byType: Record<string, string[]> = {};
  for (const [cls, type] of Object.entries(OMT_CLASS_TO_TYPE)) {
    if (type === 'custom') continue;
    (byType[type] ??= []).push(cls);
  }
  const expr: unknown[] = [
    'match',
    ['downcase', ['to-string', ['coalesce', ['get', 'subclass'], ['get', 'class'], '']]],
  ];
  for (const [type, classes] of Object.entries(byType)) {
    const color = PLACE_TYPE_META[type]?.color;
    if (!color || !classes.length) continue;
    expr.push(classes.length === 1 ? classes[0]! : classes, color);
  }
  expr.push(PLACE_TYPE_META.custom.color);
  return expr;
}

function buildMapStyleJson(themeId: ThemeId) {
  if (MAP_STYLE_URL) return JSON.stringify(MAP_STYLE_URL);
  if (MAP_TILES_URL) {
    return JSON.stringify({
      version: 8,
      sources: {
        basemap: {
          type: 'raster',
          tiles: [MAP_TILES_URL],
          tileSize: 256,
          attribution: MAP_ATTRIBUTION,
        },
      },
      layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
    });
  }
  return JSON.stringify(OPENFREEMAP_BY_THEME[themeId] ?? MAP_STYLE_POSITRON);
}

function buildHtml(
  payload: {
    center: { lat: number; lon: number };
    zoom: number;
    myLocation?: { lat: number; lon: number } | null;
    friends: MapMarkerFriend[];
    places: MapMarkerPlace[];
    favoriteIds?: string[];
  },
  themeId: ThemeId,
  pins: {
    friend: string;
    me: string;
    place: string;
    canvas: string;
    ink: string;
    surface: string;
    labelInk: string;
    labelHalo: string;
    labelHaloW: number;
    markerStroke: string;
    darkMap: boolean;
  },
) {
  const data = JSON.stringify(payload);
  const styleJson = buildMapStyleJson(themeId);
  const typeLetters = JSON.stringify(TYPE_LETTER);
  const omtMap = JSON.stringify(OMT_CLASS_TO_TYPE);
  const omtClassColor = JSON.stringify(buildOmtClassColorExpr());
  const typeColorsJson = JSON.stringify(
    Object.fromEntries(Object.entries(PLACE_TYPE_META).map(([k, v]) => [k, v.color])),
  );
  const labelInk = pins.labelInk;
  const labelHalo = pins.labelHalo;
  const labelHaloW = pins.labelHaloW;
  const markerStroke = pins.markerStroke;
  const attribColor = pins.darkMap ? '#C5D0DA' : '#21201F';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600&display=swap" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>
  html, body, #map { margin:0; height:100%; width:100%; background:${pins.canvas}; }
  .maplibregl-ctrl-attrib { font-size:10px; opacity:.55; font-family: Manrope, system-ui, sans-serif; }
  .maplibregl-ctrl-attrib a { color:${attribColor}; }
  .maplibregl-ctrl-group {
    border-radius:10px !important;
    overflow:hidden;
    box-shadow:0 1px 4px rgba(0,0,0,.18) !important;
    border:1px solid rgba(0,0,0,.08) !important;
    background:#fff !important;
  }
  .maplibregl-ctrl-group button {
    width:36px !important; height:36px !important;
    background:#fff !important;
  }
  .maplibregl-ctrl-bottom-right { display:none !important; }
  .maplibregl-ctrl-top-right { display:none !important; }
  .marker { display:flex; flex-direction:column; align-items:center; cursor:pointer; }
  .pin {
    width:28px; height:28px; border-radius:50%;
    border:1.5px solid ${markerStroke}; box-shadow:0 1px 2px rgba(0,0,0,.22);
    object-fit:cover; background:${pins.friend}; color:#fff;
    font:600 11px Manrope, system-ui, -apple-system, sans-serif;
    display:flex; align-items:center; justify-content:center;
  }
  @keyframes mapy-pop {
    0% { opacity:0; transform: scale(0.62) translateY(10px); }
    72% { opacity:1; transform: scale(1.05) translateY(0); }
    100% { opacity:1; transform: scale(1) translateY(0); }
  }
  @keyframes mapy-fade-up {
    0% { opacity:0; transform: translateY(6px); }
    100% { opacity:1; transform: translateY(0); }
  }
  @keyframes mapy-pulse-ring {
    0% { transform: scale(0.7); opacity:0.42; }
    100% { transform: scale(2.15); opacity:0; }
  }
  @keyframes mapy-dot-breathe {
    0%, 100% { transform: scale(1); box-shadow:0 0 0 0 rgba(0,102,255,0.35); }
    50% { transform: scale(1.12); box-shadow:0 0 0 4px rgba(0,102,255,0); }
  }
  @keyframes mapy-me-soft {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }
  .friend-marker {
    display:flex; flex-direction:column; align-items:center;
    justify-content:flex-end;
    cursor:pointer; user-select:none;
    transform-origin: bottom center;
    will-change: transform, opacity;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    min-width: 44px;
    min-height: 44px;
    box-sizing: border-box;
  }
  .friend-marker.enter {
    animation: mapy-pop 0.48s cubic-bezier(0.22, 1.15, 0.36, 1) both;
  }
  .friend-marker:active .friend-card {
    transform: scale(0.96);
  }
  .friend-card {
    display:flex; flex-direction:row; align-items:center; gap:8px;
    padding:5px 10px 5px 5px;
    background:rgba(255,255,255,0.96);
    border:1px solid rgba(0,0,0,0.06);
    border-radius:22px;
    box-shadow:0 4px 14px rgba(18,24,38,0.16);
    max-width:min(200px, 52vw);
    transform-origin: bottom center;
    transition:
      padding 0.32s cubic-bezier(0.22, 1, 0.36, 1),
      gap 0.32s cubic-bezier(0.22, 1, 0.36, 1),
      background 0.28s ease,
      box-shadow 0.32s ease,
      border-radius 0.32s ease,
      transform 0.18s ease;
  }
  .friend-avatar-wrap { position:relative; flex-shrink:0; }
  .friend-avatar {
    width:36px; height:36px; border-radius:50%;
    border:2px solid #fff; object-fit:cover;
    background:${pins.friend}; color:#fff;
    font:700 13px/36px Manrope, system-ui, sans-serif;
    text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.18);
    display:block;
    transition:
      width 0.34s cubic-bezier(0.22, 1, 0.36, 1),
      height 0.34s cubic-bezier(0.22, 1, 0.36, 1),
      font-size 0.34s ease,
      line-height 0.34s ease,
      border-width 0.28s ease,
      box-shadow 0.3s ease;
  }
  .friend-avatar.initial {
    display:flex; align-items:center; justify-content:center;
  }
  .friend-dot {
    position:absolute; right:-1px; bottom:-1px;
    width:11px; height:11px; border-radius:50%;
    border:2px solid #fff; background:#2E7D32;
    transition: width 0.28s ease, height 0.28s ease, background 0.35s ease, border-width 0.28s ease;
  }
  .friend-dot.moving {
    background:#0066FF;
    animation: mapy-dot-breathe 1.6s ease-in-out infinite;
  }
  .friend-dot.stale { background:#9AA0A6; animation: none; }
  .friend-meta {
    min-width:0; padding-right:2px;
    opacity:1; max-width:min(130px, 34vw);
    transform: translateX(0);
    overflow:hidden;
    transition:
      opacity 0.28s ease,
      max-width 0.34s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.34s cubic-bezier(0.22, 1, 0.36, 1),
      padding 0.28s ease;
  }
  .friend-name {
    font:600 12px/1.2 Manrope, system-ui, sans-serif;
    color:#141416; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    max-width:min(130px, 34vw);
  }
  .friend-speed {
    margin-top:2px;
    font:500 10px/1.2 Manrope, system-ui, sans-serif;
    color:#6E6E76; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    max-width:min(130px, 34vw);
    max-height:16px;
    opacity:1;
    transition: opacity 0.25s ease, max-height 0.28s ease, margin 0.28s ease;
  }
  /* Зум: далеко — только аватар; hit-area ≥44 через padding, визуал компактный */
  .zoom-tiny .friend-card {
    padding:10px; gap:0; background:transparent; border-color:transparent; box-shadow:none; border-radius:0;
  }
  .zoom-tiny .friend-meta,
  .zoom-far .friend-meta {
    opacity:0; max-width:0; padding-right:0; transform: translateX(-6px); pointer-events:none;
  }
  .zoom-tiny .friend-avatar { width:26px; height:26px; font-size:11px; line-height:26px; border-width:1.5px; }
  .zoom-tiny .friend-dot { width:8px; height:8px; border-width:1.5px; }
  .zoom-far .friend-card {
    padding:8px; gap:0; background:transparent; border-color:transparent; box-shadow:none; border-radius:0;
  }
  .zoom-far .friend-avatar { width:28px; height:28px; font-size:11px; line-height:28px; }
  .zoom-mid .friend-speed { opacity:0; max-height:0; margin-top:0; }
  .zoom-mid .friend-avatar { width:32px; height:32px; font-size:12px; line-height:32px; }
  .zoom-mid .friend-card { padding:4px 9px 4px 4px; gap:7px; }
  @media (max-width: 420px) {
    .friend-card { max-width:min(156px, 46vw); gap:6px; }
    .friend-name, .friend-speed, .friend-meta { max-width:min(96px, 28vw); }
    .friend-avatar { width:32px; height:32px; font-size:12px; line-height:32px; }
    .friend-name { font-size:11px; }
  }
  @media (max-width: 360px) {
    .friend-card { max-width:min(140px, 44vw); padding:4px 8px 4px 4px; }
    .zoom-near .friend-speed { display:none; opacity:0; max-height:0; }
  }
  .me-wrap {
    position:relative; width:22px; height:22px;
    transform-origin: center center;
  }
  .me-wrap.enter { animation: mapy-pop 0.55s cubic-bezier(0.22, 1.15, 0.36, 1) both; }
  .me-ring, .me-ring-2 {
    position:absolute; left:50%; top:50%;
    width:22px; height:22px; margin:-11px 0 0 -11px;
    border-radius:50%;
    background:${pins.me};
    opacity:0.28;
    pointer-events:none;
    animation: mapy-pulse-ring 2.2s cubic-bezier(0.22, 0.6, 0.35, 1) infinite;
  }
  .me-ring-2 { animation-delay: 1.1s; opacity:0.18; }
  .me {
    width:12px; height:12px; border-radius:6px; background:${pins.me};
    border:2px solid #fff; box-shadow:0 0 0 3px ${pins.me}28;
    position:absolute; left:5px; top:5px;
    animation: mapy-me-soft 2.4s ease-in-out infinite;
  }
  /* Не анимировать transform на корне Popup — иначе ломается позиция MapLibre */
  @keyframes mapy-popup-in {
    0% { opacity:0; }
    100% { opacity:1; }
  }
  .mapy-hover-popup { animation: mapy-popup-in 0.16s ease both; }
  .mapy-hover-popup .maplibregl-popup-content {
    padding: 0;
    border-radius: 12px;
    box-shadow: 0 10px 32px rgba(18, 24, 38, 0.18);
    border: 1px solid rgba(0,0,0,0.08);
    overflow: hidden;
    background: #fff;
    animation: mapy-fade-up 0.22s ease both;
  }
  .mapy-hover-popup .maplibregl-popup-tip {
    border-top-color: #fff;
  }
  @media (prefers-reduced-motion: reduce) {
    .friend-marker.enter, .me-wrap.enter, .mapy-hover-popup,
    .mapy-hover-popup .maplibregl-popup-content,
    .friend-dot.moving, .me, .me-ring, .me-ring-2 {
      animation: none !important;
    }
    .friend-card, .friend-avatar, .friend-meta, .friend-speed, .friend-dot {
      transition-duration: 0.01ms !important;
    }
  }
  .hover-card {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    min-width: 188px;
    max-width: 268px;
    cursor: pointer;
    font-family: Manrope, system-ui, sans-serif;
    user-select: none;
  }
  .hover-card:hover { background: #F7F8FA; }
  .hover-dot {
    width: 10px; height: 10px; border-radius: 50%;
    margin-top: 5px; flex-shrink: 0;
    box-shadow: 0 0 0 3px rgba(0,102,255,0.12);
  }
  .hover-body { min-width: 0; flex: 1; }
  .hover-name {
    font: 600 13px/1.25 Manrope, system-ui, sans-serif;
    color: #1A1A1A;
    margin: 0 0 3px;
  }
  .hover-type {
    font: 500 11px/1.2 Manrope, system-ui, sans-serif;
    color: #5C6B7A;
  }
  .hover-hint {
    margin-top: 8px;
    font: 500 10px/1 Manrope, system-ui, sans-serif;
    color: #8A94A6;
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  const boot = ${data};
  const TYPE_LETTER = ${typeLetters};
  const OMT_CLASS_TO_TYPE = ${omtMap};
  const OMT_CLASS_COLOR = ${omtClassColor};
  const TYPE_COLORS = ${typeColorsJson};
  const LABEL_INK = ${JSON.stringify(labelInk)};
  const LABEL_HALO = ${JSON.stringify(labelHalo)};
  const LABEL_HALO_W = ${labelHaloW};
  const MARKER_STROKE = ${JSON.stringify(markerStroke)};
  const THEME_ID = ${JSON.stringify(themeId)};
  function isBadPlaceName(name){
    var raw = String(name || '').trim();
    if (!raw) return true;
    var low = raw.toLowerCase();
    if (/^(место|место osm|без названия|custom|poi|place|точка|точка на карте|unnamed|unknown|yes|no|null|магазин|кафе|остановка|азс|парк)$/i.test(raw)) return true;
    if (OMT_CLASS_TO_TYPE[low]) return true;
    // cafe / car_repair / seafood — тег OSM, не вывеска
    if (raw === low && /^[a-z][a-z0-9_]{0,40}$/.test(raw)) {
      if (low.length <= 2 || low.indexOf('_') >= 0 || OMT_CLASS_TO_TYPE[low]) return true;
    }
    return false;
  }
  const TYPE_LABELS_STATIC = {
    cafe: 'Кафе',
    gas_station: 'АЗС',
    shop: 'Магазин',
    transit: 'Транспорт',
    park: 'Парк',
    home: 'Дом',
    custom: 'Точка'
  };
  let latest = {
    myLocation: boot.myLocation || null,
    friends: boot.friends || [],
    places: boot.places || [],
    favoriteIds: boot.favoriteIds || []
  };
  const map = new maplibregl.Map({
    container: 'map',
    style: ${styleJson},
    center: [boot.center.lon, boot.center.lat],
    zoom: Math.max(boot.zoom || 13, 11),
    attributionControl: { compact: true },
    pitchWithRotate: false
  });
  const markers = [];
  const friendMarkers = {};
  let meMarker = null;
  let followFriendId = null;
  let followEaseUntil = 0;
  let mapReady = false;
  let pendingUpdate = null;
  let pendingFly = null;
  let animRaf = null;
  const animTargets = {};
  const friendTrails = {};
  let trailDirty = false;
  let trailRaf = null;
  let lastTrailFlush = 0;
  const TRAIL_MAX_POINTS = 56;
  const TRAIL_MIN_STEP = 0.00001;
  const TRAIL_JUMP_RESET = 0.006;
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const TRAIL_HEAD = '${pins.friend}';

  function hexToRgba(hex, a){
    var h = String(hex || '#0066FF').replace('#','');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var n = parseInt(h, 16);
    if (!isFinite(n)) return 'rgba(0,102,255,'+a+')';
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 'rgba('+r+','+g+','+b+','+a+')';
  }

  function post(obj){
    const msg = JSON.stringify(obj);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
    else window.parent && window.parent.postMessage(msg, '*');
  }
  function clearMarkers(){
    Object.keys(friendMarkers).forEach(id => { friendMarkers[id].remove(); delete friendMarkers[id]; });
    if (meMarker) { meMarker.remove(); meMarker = null; }
    markers.length = 0;
    Object.keys(animTargets).forEach(k => delete animTargets[k]);
    Object.keys(friendTrails).forEach(k => delete friendTrails[k]);
    trailDirty = true;
    flushFriendTrails(performance.now(), true);
    stopFollowFriend();
  }
  function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }
  function esc(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
  function lerp(a,b,t){ return a + (b - a) * t; }

  function tickAnim(now){
    animRaf = null;
    let active = false;
    Object.keys(animTargets).forEach(id => {
      const job = animTargets[id];
      if (!job || !job.marker) { delete animTargets[id]; return; }
      const t = Math.min(1, (now - job.started) / job.duration);
      const e = easeOutCubic(t);
      const lat = lerp(job.fromLat, job.toLat, e);
      const lon = lerp(job.fromLon, job.toLon, e);
      job.marker.setLngLat([lon, lat]);
      if (!reduceMotion) pushTrailSample(id, lon, lat, job.kind || 'friend');
      if (t < 1) active = true;
      else delete animTargets[id];
    });
    if (!reduceMotion) {
      decayFriendTrails(now);
      flushFriendTrails(now, false);
    }
    if (active) animRaf = requestAnimationFrame(tickAnim);
    else if (!reduceMotion && hasActiveTrails()) scheduleTrailTick();
  }

  function moveMarker(id, marker, lon, lat, duration, kind){
    const cur = marker.getLngLat();
    const dist = Math.hypot(cur.lng - lon, cur.lat - lat);
    if (dist < 0.00001) {
      marker.setLngLat([lon, lat]);
      delete animTargets[id];
      return;
    }
    if (dist > TRAIL_JUMP_RESET) resetTrail(id);
    animTargets[id] = {
      marker,
      fromLon: cur.lng,
      fromLat: cur.lat,
      toLon: lon,
      toLat: lat,
      started: performance.now(),
      duration: duration || (dist > 0.02 ? 900 : 450),
      kind: kind || (id === 'me' ? 'me' : 'friend')
    };
    if (!reduceMotion) pushTrailSample(id, cur.lng, cur.lat, animTargets[id].kind);
    if (!animRaf) animRaf = requestAnimationFrame(tickAnim);
  }

  function hasActiveTrails(){
    var ids = Object.keys(friendTrails);
    for (var i = 0; i < ids.length; i++) {
      if ((friendTrails[ids[i]].coords || []).length >= 2) return true;
    }
    return false;
  }

  function resetTrail(id){
    delete friendTrails[id];
    trailDirty = true;
  }

  function pushTrailSample(id, lon, lat, kind){
    if (reduceMotion || lon == null || lat == null) return;
    var trail = friendTrails[id];
    if (!trail) {
      friendTrails[id] = trail = { coords: [], lastPush: performance.now(), kind: kind || 'friend' };
    }
    trail.kind = kind || trail.kind || 'friend';
    var coords = trail.coords;
    if (coords.length) {
      var last = coords[coords.length - 1];
      var d = Math.hypot(last[0] - lon, last[1] - lat);
      if (d > TRAIL_JUMP_RESET) {
        trail.coords = [[lon, lat]];
        trail.lastPush = performance.now();
        trailDirty = true;
        scheduleTrailTick();
        return;
      }
      if (d < TRAIL_MIN_STEP) return;
    }
    coords.push([lon, lat]);
    if (coords.length > TRAIL_MAX_POINTS) coords.splice(0, coords.length - TRAIL_MAX_POINTS);
    trail.lastPush = performance.now();
    trailDirty = true;
    scheduleTrailTick();
  }

  function decayFriendTrails(now){
    Object.keys(friendTrails).forEach(function(id){
      var trail = friendTrails[id];
      if (!trail || !trail.coords || !trail.coords.length) return;
      var idle = now - (trail.lastPush || 0);
      if (idle < 1800) return;
      var drop = idle > 4500 ? Math.max(2, Math.ceil(trail.coords.length * 0.18)) : 1;
      trail.coords.splice(0, drop);
      trailDirty = true;
      if (trail.coords.length < 2) delete friendTrails[id];
    });
  }

  function ensureTrailLayers(){
    if (!mapReady) return;
    if (!map.getSource('mapy_friend_trails')) {
      map.addSource('mapy_friend_trails', {
        type: 'geojson',
        lineMetrics: true,
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addLayer({
        id: 'mapy_friend_trails_glow',
        type: 'line',
        source: 'mapy_friend_trails',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            10, 7,
            13, 14,
            16, 20,
            18, 24
          ],
          'line-blur': [
            'interpolate', ['linear'], ['zoom'],
            10, 0.6,
            16, 1.4
          ],
          'line-gradient': [
            'interpolate', ['linear'], ['line-progress'],
            0, 'rgba(0,102,255,0)',
            0.2, hexToRgba(TRAIL_HEAD, 0.04),
            0.55, hexToRgba(TRAIL_HEAD, 0.16),
            0.85, hexToRgba(TRAIL_HEAD, 0.28),
            1, hexToRgba(TRAIL_HEAD, 0.38)
          ]
        }
      });
      map.addLayer({
        id: 'mapy_friend_trails_core',
        type: 'line',
        source: 'mapy_friend_trails',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            10, 2.2,
            13, 3.6,
            16, 5,
            18, 6
          ],
          'line-gradient': [
            'interpolate', ['linear'], ['line-progress'],
            0, 'rgba(255,255,255,0)',
            0.18, hexToRgba(TRAIL_HEAD, 0.05),
            0.42, hexToRgba(TRAIL_HEAD, 0.35),
            0.7, hexToRgba(TRAIL_HEAD, 0.78),
            0.9, hexToRgba(TRAIL_HEAD, 0.95),
            1, 'rgba(255,255,255,0.92)'
          ]
        }
      });
    }
  }

  function flushFriendTrails(now, force){
    if (!mapReady) return;
    if (!trailDirty && !force) return;
    if (!force && now - lastTrailFlush < 28) return;
    lastTrailFlush = now;
    trailDirty = false;
    ensureTrailLayers();
    var src = map.getSource('mapy_friend_trails');
    if (!src) return;
    var features = [];
    Object.keys(friendTrails).forEach(function(id){
      var trail = friendTrails[id];
      var c = trail && trail.coords;
      if (!c || c.length < 2) return;
      features.push({
        type: 'Feature',
        properties: { id: id, kind: trail.kind || 'friend' },
        geometry: { type: 'LineString', coordinates: c.slice() }
      });
    });
    src.setData({ type: 'FeatureCollection', features: features });
  }

  function scheduleTrailTick(){
    if (reduceMotion || trailRaf) return;
    trailRaf = requestAnimationFrame(function(now){
      trailRaf = null;
      decayFriendTrails(now);
      flushFriendTrails(now, false);
      if (hasActiveTrails() && !animRaf) scheduleTrailTick();
    });
  }

  function formatFriendSpeed(f){
    var mps = f.speed_mps;
    var status = f.derived_status || 'unknown';
    var mode = f.accuracy_mode || 'precise';
    if (mode === 'stale') return 'Давно не обновлялся';
    if (mps != null && mps >= 0.4) {
      var kmh = Math.round(mps * 3.6);
      if (kmh < 1) kmh = 1;
      if (kmh < 8) return kmh + ' км/ч · идёт';
      if (kmh < 25) return kmh + ' км/ч · бежит';
      return kmh + ' км/ч · едет';
    }
    if (status === 'moving') return 'В пути';
    if (status === 'stationary') return 'На месте';
    return 'В сети';
  }

  function friendDotClass(f){
    if (f.accuracy_mode === 'stale') return 'friend-dot stale';
    if (f.derived_status === 'moving' || (f.speed_mps != null && f.speed_mps >= 0.4)) return 'friend-dot moving';
    return 'friend-dot';
  }

  function friendInnerHtml(f){
    var name = (f.display_name || f.username || '?');
    var initial = String(name).slice(0,1).toUpperCase();
    var speed = formatFriendSpeed(f);
    var avatar = f.avatar_url
      ? '<img class="friend-avatar" src="'+esc(f.avatar_url)+'" alt="" />'
      : '<div class="friend-avatar initial">'+esc(initial)+'</div>';
    return '<div class="friend-card">'
      + '<div class="friend-avatar-wrap">'+avatar+'<span class="'+friendDotClass(f)+'"></span></div>'
      + '<div class="friend-meta">'
      + '<div class="friend-name">'+esc(name)+'</div>'
      + '<div class="friend-speed">'+esc(speed)+'</div>'
      + '</div></div>';
  }

  function stopFollowFriend(){
    followFriendId = null;
    followEaseUntil = 0;
  }

  function startFollowFriend(f){
    if (!f || !f.user_id || f.lat == null || f.lon == null) return;
    followFriendId = f.user_id;
    var z = Math.max(map.getZoom(), 16);
    followEaseUntil = performance.now() + 1000;
    map.flyTo({
      center: [f.lon, f.lat],
      zoom: z,
      essential: true,
      speed: 1.2,
      curve: 1.3,
      easing: function(t){ return 1 - Math.pow(1 - t, 3); }
    });
  }

  function syncFollowCamera(f){
    if (!followFriendId || followFriendId !== f.user_id) return;
    if (f.lat == null || f.lon == null) return;
    var now = performance.now();
    if (now < followEaseUntil) return;
    var dur = Math.min(720, 340 + (f.speed_mps || 0) * 42);
    followEaseUntil = now + dur * 0.85;
    map.easeTo({
      center: [f.lon, f.lat],
      duration: dur,
      essential: true,
      easing: function(t){ return t * (2 - t); }
    });
  }

  function onFriendMarkerClick(f, e){
    if (e) { e.preventDefault(); e.stopPropagation(); }
    startFollowFriend(f);
    post({
      type: 'friend',
      id: f.user_id,
      lat: f.lat,
      lon: f.lon,
      follow: true
    });
  }

  function makeFriendEl(f){
    const node = el('<div class="friend-marker enter"></div>');
    node.setAttribute('data-sig', friendContentSig(f));
    node.innerHTML = friendInnerHtml(f);
    node.style.animationDelay = ((hashStr(String(f.user_id)) % 9) * 40) + 'ms';
    node.addEventListener('animationend', function(){
      node.classList.remove('enter');
      node.style.animationDelay = '';
    }, { once: true });
    node.onclick = function(e){ onFriendMarkerClick(f, e); };
    return node;
  }

  function friendContentSig(f){
    return [
      f.user_id,
      f.display_name || '',
      f.username || '',
      f.avatar_url || '',
      f.speed_mps == null ? '' : Math.round(f.speed_mps * 10),
      f.derived_status || '',
      f.accuracy_mode || ''
    ].join('|');
  }

  function updateFriendEl(node, f){
    if (!node) return;
    var sig = friendContentSig(f);
    if (node.getAttribute('data-sig') !== sig) {
      node.setAttribute('data-sig', sig);
      node.innerHTML = friendInnerHtml(f);
    }
    node.onclick = function(e){ onFriendMarkerClick(f, e); };
  }

  function applyFriendZoomClass(){
    var z = map.getZoom();
    var root = document.body;
    root.classList.remove('zoom-tiny', 'zoom-far', 'zoom-mid', 'zoom-near');
    // Минимальный аватар 24px — не превращается в точку на ретине/телефонах
    if (z < 9.5) root.classList.add('zoom-tiny');
    else if (z < 12) root.classList.add('zoom-far');
    else if (z < 14) root.classList.add('zoom-mid');
    else root.classList.add('zoom-near');
  }

  function isFavoritePlace(p){
    if (!p) return false;
    if (p.is_favorite) return true;
    var ids = latest.favoriteIds || [];
    var id = String(p.id || '');
    for (var i = 0; i < ids.length; i++) if (String(ids[i]) === id) return true;
    return false;
  }

  function placesGeoJSON(places){
    return {
      type: 'FeatureCollection',
      features: (places||[]).filter(p => p.lat != null && p.lon != null).map(p => {
        var t = p.place_type || 'custom';
        var rawName = String(p.name || '').trim();
        var label = TYPE_LABELS_STATIC[t] || 'Точка';
        var bad = !rawName || isBadPlaceName(rawName);
        var fav = isFavoritePlace(p);
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
          properties: {
            id: p.id,
            name: bad ? label : rawName,
            place_type: t,
            type_label: label,
            icon: fav ? 'mapy-favorite' : ('mapy-' + t),
            letter: TYPE_LETTER[t] || '·',
            has_chat: p.has_chat ? 1 : 0,
            is_favorite: fav ? 1 : 0,
            rank: placeRank(p)
          }
        };
      })
    };
  }

  function placeRank(p){
    if (isFavoritePlace(p)) return 0;
    if (p.has_chat) return 1;
    const t = p.place_type || 'custom';
    if (t === 'transit') return 2;
    if (t === 'gas_station') return 3;
    if (t === 'home') return 4;
    if (t === 'cafe') return 5;
    if (t === 'shop') return 6;
    if (t === 'park') return 7;
    return 10;
  }

  /** Прореживание: дальний зум — редкие «маяки», средний — спокойно, близко — плотнее. Избранные всегда. */
  function thinPlacesForZoom(places, zoom){
    const list = (places || []).filter(p => p.lat != null && p.lon != null);
    var favs = [];
    var rest = [];
    for (var i = 0; i < list.length; i++) {
      if (isFavoritePlace(list[i])) favs.push(list[i]);
      else rest.push(list[i]);
    }
    const z = zoom == null ? 13 : zoom;
    var maxCount, maxRank, cell;
    // Средний городской зум (12–15) — сильно реже, как у Яндекса
    if (z < 9)       { maxCount = 28;  maxRank = 8;  cell = 0.14; }
    else if (z < 10) { maxCount = 40;  maxRank = 8;  cell = 0.09; }
    else if (z < 11) { maxCount = 50;  maxRank = 7;  cell = 0.06; }
    else if (z < 12) { maxCount = 45;  maxRank = 6;  cell = 0.045; }
    else if (z < 13) { maxCount = 28;  maxRank = 4;  cell = 0.035; }
    else if (z < 14) { maxCount = 32;  maxRank = 5;  cell = 0.025; }
    else if (z < 15) { maxCount = 42;  maxRank = 6;  cell = 0.016; }
    else if (z < 16) { maxCount = 80;  maxRank = 9;  cell = 0.007; }
    else if (z < 17) { maxCount = 320; maxRank = 99; cell = 0.002; }
    else             { maxCount = 900; maxRank = 99; cell = 0; }

    var scored = rest.map(function(p, i){
      return { p: p, rank: placeRank(p), i: i };
    }).filter(function(x){ return x.rank <= maxRank; });

    scored.sort(function(a, b){
      if (a.rank !== b.rank) return a.rank - b.rank;
      return hashStr(String(a.p.id || a.i)) - hashStr(String(b.p.id || b.i));
    });

    var seen = {};
    var out = favs.slice();
    var budget = Math.max(0, maxCount - out.length);
    for (var k = 0; k < scored.length && out.length - favs.length < budget; k++) {
      var item = scored[k];
      if (cell > 0) {
        var key = Math.floor(item.p.lat / cell) + ':' + Math.floor(item.p.lon / cell);
        if (seen[key]) continue;
        seen[key] = true;
      }
      out.push(item.p);
    }
    return out;
  }

  function hashStr(s){
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function pushPlacesToMap(){
    if (!mapReady || !map.getSource('mapy_places')) return;
    var visible = thinPlacesForZoom(latest.places || [], map.getZoom());
    map.getSource('mapy_places').setData(placesGeoJSON(visible));
  }

  /** Бейдж как в левом меню: цветной скруглённый квадрат + белая иконка Feather/Lucide */
  function badgeIcon(bg, glyph){
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">'
      + '<rect x="1.5" y="1.5" width="37" height="37" rx="11" fill="'+bg+'" stroke="#ffffff" stroke-width="2"/>'
      + '<g transform="translate(8,8)" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + glyph
      + '</g></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // Glyphs: Feather / Lucide 24×24
  const GLYPH_CAFE = '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>';
  const GLYPH_GAS = '<path d="M3 22V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M3 12h10"/><path d="M14 10h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V8.83a2 2 0 0 0-.59-1.42L18 5"/><path d="M14 22V10"/>';
  const GLYPH_SHOP = '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>';
  const GLYPH_TRANSIT = '<path d="M3 14h18"/><path d="M5 18h2"/><path d="M17 18h2"/><rect x="4" y="4" width="16" height="12" rx="2"/><path d="M8 8h8"/><circle cx="8.5" cy="18.5" r="1.5" fill="#fff" stroke="none"/><circle cx="15.5" cy="18.5" r="1.5" fill="#fff" stroke="none"/>';
  const GLYPH_PARK = '<path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12.5 13a3 3 0 1 0-2.4-5.2"/><path d="M17 16a3 3 0 1 0-2.4-5.2"/><path d="M14.5 19h4a2 2 0 0 0 0-4h-1"/>';
  const GLYPH_HOME = '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>';
  const GLYPH_PIN = '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>';
  const GLYPH_STAR = '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#fff" stroke="none"/>';

  const PLACE_ICONS = {
    'mapy-cafe': badgeIcon(TYPE_COLORS.cafe || '#E67E22', GLYPH_CAFE),
    'mapy-gas_station': badgeIcon(TYPE_COLORS.gas_station || '#2E7D32', GLYPH_GAS),
    'mapy-shop': badgeIcon(TYPE_COLORS.shop || '#0066FF', GLYPH_SHOP),
    'mapy-transit': badgeIcon(TYPE_COLORS.transit || '#1565C0', GLYPH_TRANSIT),
    'mapy-park': badgeIcon(TYPE_COLORS.park || '#43A047', GLYPH_PARK),
    'mapy-home': badgeIcon(TYPE_COLORS.home || '#C62828', GLYPH_HOME),
    'mapy-custom': badgeIcon(TYPE_COLORS.custom || '#5C6B7A', GLYPH_PIN),
    'mapy-favorite': badgeIcon('#F5C400', GLYPH_STAR)
  };

  function loadPlaceIcons(){
    return Promise.all(Object.keys(PLACE_ICONS).map(id => new Promise(resolve => {
      if (map.hasImage(id)) { resolve(); return; }
      const img = new Image(40, 40);
      img.onload = () => { try { if (!map.hasImage(id)) map.addImage(id, img, { pixelRatio: 2 }); } catch(e) {} resolve(); };
      img.onerror = () => resolve();
      img.src = PLACE_ICONS[id];
    })));
  }

  function ensurePlacesLayer(){
    if (!map.getSource('mapy_places')) {
      map.addSource('mapy_places', { type: 'geojson', data: placesGeoJSON([]) });
      // Избранные — жёлтые точки с дальнего зума
      map.addLayer({
        id: 'mapy_fav_dots',
        type: 'circle',
        source: 'mapy_places',
        minzoom: 7,
        maxzoom: 10.6,
        filter: ['==', ['get', 'is_favorite'], 1],
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            7, 4.5,
            9, 5.5,
            11, 6.5
          ],
          'circle-color': '#F5C400',
          'circle-stroke-width': 1.8,
          'circle-stroke-color': MARKER_STROKE,
          'circle-opacity': [
            'interpolate', ['linear'], ['zoom'],
            7, 0,
            7.4, 0.95,
            10.2, 0.95,
            10.6, 0
          ],
          'circle-radius-transition': { duration: 380 },
          'circle-opacity-transition': { duration: 420 }
        }
      });
      map.addLayer({
        id: 'mapy_fav_icon',
        type: 'symbol',
        source: 'mapy_places',
        minzoom: 10.5,
        filter: ['==', ['get', 'is_favorite'], 1],
        layout: {
          'icon-image': 'mapy-favorite',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 10.5, 0.42, 11.2, 0.62, 13, 0.72, 16, 0.88],
          'icon-anchor': 'center',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'text-field': ['step', ['zoom'], '', 13.8, ['get', 'name']],
          'text-size': 11,
          'text-offset': [0, 1.35],
          'text-anchor': 'top',
          'text-max-width': 9,
          'text-optional': true,
          'text-allow-overlap': false,
          'text-font': ['Noto Sans Regular']
        },
        paint: {
          'icon-opacity': [
            'interpolate', ['linear'], ['zoom'],
            10.5, 0,
            10.9, 1
          ],
          'text-opacity': [
            'interpolate', ['linear'], ['zoom'],
            13.8, 0,
            14.2, 1
          ],
          'text-color': LABEL_INK,
          'text-halo-color': LABEL_HALO,
          'text-halo-width': LABEL_HALO_W,
          'icon-opacity-transition': { duration: 420 },
          'text-opacity-transition': { duration: 360 }
        }
      });
      // Дальний/средний зум — цветные точки; ближе — те же бейджи, что в меню
      map.addLayer({
        id: 'mapy_places_dots',
        type: 'circle',
        source: 'mapy_places',
        minzoom: 8,
        maxzoom: 12.6,
        filter: ['!=', ['get', 'is_favorite'], 1],
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            8, 3.2,
            10, 4.2,
            12, 5.2
          ],
          'circle-color': [
            'match', ['get', 'place_type'],
            'cafe', TYPE_COLORS.cafe,
            'gas_station', TYPE_COLORS.gas_station,
            'shop', TYPE_COLORS.shop,
            'transit', TYPE_COLORS.transit,
            'park', TYPE_COLORS.park,
            'home', TYPE_COLORS.home,
            TYPE_COLORS.custom
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': MARKER_STROKE,
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0, 8.35, 0.72, 11, 0.9, 12.2, 0.95, 12.6, 0],
          'circle-blur': ['interpolate', ['linear'], ['zoom'], 8, 0.15, 11, 0],
          'circle-radius-transition': { duration: 360 },
          'circle-opacity-transition': { duration: 420 },
          'circle-blur-transition': { duration: 320 }
        }
      });
      map.addLayer({
        id: 'mapy_places_icon',
        type: 'symbol',
        source: 'mapy_places',
        minzoom: 12.4,
        filter: ['!=', ['get', 'is_favorite'], 1],
        layout: {
          'icon-image': ['coalesce', ['image', ['get', 'icon']], 'mapy-custom'],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 12.4, 0.38, 12.9, 0.62, 14, 0.72, 17, 0.9],
          'icon-anchor': 'center',
          'icon-allow-overlap': false,
          'icon-ignore-placement': false,
          'icon-padding': ['interpolate', ['linear'], ['zoom'], 12.4, 10, 15, 5, 17, 2],
          'text-field': ['step', ['zoom'], '', 15.2, ['get', 'name']],
          'text-size': 11,
          'text-offset': [0, 1.35],
          'text-anchor': 'top',
          'text-max-width': 9,
          'text-optional': true,
          'text-allow-overlap': false,
          'text-font': ['Noto Sans Regular']
        },
        paint: {
          'icon-opacity': [
            'interpolate', ['linear'], ['zoom'],
            12.4, 0,
            12.85, 1
          ],
          'text-opacity': [
            'interpolate', ['linear'], ['zoom'],
            15.2, 0,
            15.55, 1
          ],
          'text-color': LABEL_INK,
          'text-halo-color': LABEL_HALO,
          'text-halo-width': LABEL_HALO_W,
          'icon-opacity-transition': { duration: 450 },
          'text-opacity-transition': { duration: 380 }
        }
      });
    }
  }

  function render(state){
    if (!mapReady) { pendingUpdate = state; return; }
    ensurePlacesLayer();
    pushPlacesToMap();

    if (state.myLocation) {
      if (!meMarker) {
        meMarker = new maplibregl.Marker({
          element: el('<div class="me-wrap enter"><div class="me-ring"></div><div class="me-ring me-ring-2"></div><div class="me"></div></div>'),
          anchor: 'center'
        }).setLngLat([state.myLocation.lon, state.myLocation.lat]).addTo(map);
        var meEl = meMarker.getElement();
        meEl.addEventListener('animationend', function(){ meEl.classList.remove('enter'); }, { once: true });
      } else {
        moveMarker('me', meMarker, state.myLocation.lon, state.myLocation.lat, 380, 'me');
      }
    } else if (meMarker) {
      meMarker.remove();
      meMarker = null;
      delete animTargets.me;
      resetTrail('me');
    }

    const seen = {};
    (state.friends||[]).forEach(f => {
      if (f.lat == null || f.lon == null || !f.user_id) return;
      seen[f.user_id] = true;
      let m = friendMarkers[f.user_id];
      if (!m) {
        m = new maplibregl.Marker({ element: makeFriendEl(f), anchor: 'bottom' })
          .setLngLat([f.lon, f.lat]).addTo(map);
        friendMarkers[f.user_id] = m;
      } else {
        updateFriendEl(m.getElement(), f);
        moveMarker(
          f.user_id,
          m,
          f.lon,
          f.lat,
          Math.min(900, 380 + (f.speed_mps || 0) * 40),
          'friend'
        );
      }
      syncFollowCamera(f);
    });
    Object.keys(friendMarkers).forEach(id => {
      if (!seen[id]) {
        friendMarkers[id].remove();
        delete friendMarkers[id];
        delete animTargets[id];
        resetTrail(id);
        if (followFriendId === id) stopFollowFriend();
      }
    });
    ensureTrailLayers();
    applyFriendZoomClass();
  }

  function emitRegion(){
    const b = map.getBounds();
    const c = map.getCenter();
    post({
      type: 'region',
      bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(','),
      center: { lat: c.lat, lon: c.lng },
      zoom: map.getZoom()
    });
  }

  function setPaintSafe(id, prop, value){
    try {
      if (!map.getLayer(id)) return;
      map.setPaintProperty(id, prop, value);
    } catch (e) {}
  }

  /** Тёмная = чистый инверт светлой: земля тёмная, вода чуть синее, здания мягкие, дороги читаемые. */
  function tuneBasemapStructure(){
    if (THEME_ID !== 'midnight') return;
    try {
      setPaintSafe('background', 'background-color', '#121416');
      setPaintSafe('water', 'fill-color', '#1A2433');
      setPaintSafe('waterway', 'line-color', '#243447');
      setPaintSafe('landuse_residential', 'fill-color', '#15171A');
      setPaintSafe('landuse_park', 'fill-color', '#161A16');
      setPaintSafe('landcover_wood', 'fill-color', '#141814');
      // Здания: без яркой сетки контуров при зуме (как в Positron — масса, не wireframe)
      setPaintSafe('building', 'fill-color', '#1C2026');
      setPaintSafe('building', 'fill-outline-color', '#1C2026');
      setPaintSafe('building', 'fill-opacity', [
        'interpolate', ['linear'], ['zoom'],
        13, 0.35,
        15, 0.55,
        17, 0.72
      ]);
      // Дороги: иерархия как в светлой, только инвертированные серые
      setPaintSafe('highway_path', 'line-color', '#2A3038');
      setPaintSafe('highway_minor', 'line-color', '#3E4652');
      setPaintSafe('highway_minor', 'line-opacity', 1);
      setPaintSafe('highway_major_casing', 'line-color', '#0E1012');
      setPaintSafe('highway_major_inner', 'line-color', '#545C6A');
      setPaintSafe('highway_major_subtle', 'line-color', '#3A424C');
      setPaintSafe('highway_motorway_casing', 'line-color', '#0E1012');
      setPaintSafe('highway_motorway_inner', 'line-color', '#6A7384');
      setPaintSafe('highway_motorway_subtle', 'line-color', '#4A5464');
      setPaintSafe('road_area_pier', 'fill-color', '#2A3038');
      setPaintSafe('road_pier', 'line-color', '#3A424C');
      setPaintSafe('railway', 'line-color', '#3A4048');
      setPaintSafe('railway_dashline', 'line-color', '#4A5058');
      setPaintSafe('railway_minor', 'line-color', '#323840');
      setPaintSafe('railway_minor_dashline', 'line-color', '#424850');
      setPaintSafe('railway_transit', 'line-color', '#3A4048');
      setPaintSafe('railway_transit_dashline', 'line-color', '#4A5058');
      setPaintSafe('aeroway-taxiway', 'line-color', '#3A424C');
      setPaintSafe('aeroway-runway', 'line-color', '#4A5464');
      setPaintSafe('aeroway-runway-casing', 'line-color', '#1A1C20');
      setPaintSafe('aeroway-area', 'fill-color', '#1C2026');
      setPaintSafe('boundary_state', 'line-color', '#4A5464');
      setPaintSafe('boundary_country_z0-4', 'line-color', '#6A7384');
      setPaintSafe('boundary_country_z5-', 'line-color', '#6A7384');
    } catch (e) {}
  }

  /** Тёмная: весь текст светлый + тёмный halo (как белая тема наоборот). */
  function tuneBasemapLabels(){
    if (THEME_ID !== 'midnight') return;
    try {
      (map.getStyle().layers || []).forEach(function(l){
        if (!l || l.type !== 'symbol') return;
        if (String(l.id).indexOf('mapy_') === 0) return;
        var id = String(l.id);
        var isWater = /water/i.test(id);
        try {
          map.setPaintProperty(id, 'text-color', isWater ? '#C8D4E8' : '#E8ECF2');
          map.setPaintProperty(id, 'text-halo-color', 'rgba(0,0,0,0.88)');
          map.setPaintProperty(id, 'text-halo-width', isWater ? 1.35 : 1.15);
          map.setPaintProperty(id, 'text-halo-blur', 0.25);
        } catch (e) {}
      });
    } catch (e) {}
  }

  /** Гибрид (Liberty): синий текст рек на синей воде — тёмные буквы + белый halo. */
  function tuneLibertyWaterLabels(){
    if (THEME_ID !== 'aurora') return;
    try {
      (map.getStyle().layers || []).forEach(function(l){
        if (!l || l.type !== 'symbol' || !l.id) return;
        if (String(l.id).indexOf('mapy_') === 0) return;
        if (!/water/i.test(String(l.id))) return;
        setPaintSafe(l.id, 'text-color', '#1A3050');
        setPaintSafe(l.id, 'text-halo-color', 'rgba(255,255,255,0.95)');
        setPaintSafe(l.id, 'text-halo-width', 1.6);
        setPaintSafe(l.id, 'text-halo-blur', 0.2);
      });
    } catch (e) {}
  }

  function boostPois(){
    // Прячем все базовые POI стиля — рисуем только наши прореженные слои
    try {
      (map.getStyle().layers || []).forEach(function(l){
        if (!l || !l.id) return;
        if (String(l.id).indexOf('mapy_') === 0) return;
        if (l['source-layer'] === 'poi' || /^poi_/i.test(l.id)) {
          try { map.setLayoutProperty(l.id, 'visibility', 'none'); } catch (e) {}
        }
      });
    } catch (e) {}

    if (!map.getSource('openmaptiles')) {
      ensurePlacesLayer();
      return;
    }

    // не подписываем теги типа name=cafe / name=seafood (= class/subclass)
    const nameRaw = ['coalesce', ['get', 'name'], ['get', 'name_en'], ['get', 'name_ru'], ''];
    const nameLower = ['downcase', ['to-string', nameRaw]];
    const nameExpr = ['case',
      ['any',
        ['==', nameLower, ''],
        ['==', nameLower, ['downcase', ['to-string', ['coalesce', ['get', 'class'], '']]]],
        ['==', nameLower, ['downcase', ['to-string', ['coalesce', ['get', 'subclass'], '']]]],
        ['match', nameLower, Object.keys(OMT_CLASS_TO_TYPE), true, false]
      ],
      '',
      ['case',
        ['has', 'name:nonlatin'], ['concat', ['get', 'name:latin'], '\\n', ['get', 'name:nonlatin']],
        nameRaw
      ]
    ];
    const iconExpr = ['match', ['get', 'subclass'],
      ['florist', 'furniture'], ['get', 'subclass'],
      ['get', 'class']
    ];
    const rank = ['to-number', ['coalesce', ['get', 'rank'], 50]];
    // без parking — иначе центр города заливает «P»
    const isTransit = ['match', ['get', 'class'],
      ['airport', 'rail', 'railway', 'subway', 'station', 'ferry'], true, false];
    const isLocalTransit = ['match', ['get', 'class'],
      ['bus', 'tram'], true, false];
    const isNoisy = ['match', ['get', 'class'],
      ['parking', 'bicycle_parking', 'entrance', 'toilets', 'bench', 'waste_basket', 'drinking_water', 'post_box', 'atm'], true, false];
    const isLandmark = ['match', ['get', 'class'],
      ['attraction', 'museum', 'theatre', 'cinema', 'monument', 'viewpoint', 'place_of_worship', 'town_hall', 'college', 'university'], true, false];

    if (!map.getLayer('mapy_poi_far')) {
      map.addLayer({
        id: 'mapy_poi_far',
        type: 'circle',
        source: 'openmaptiles',
        'source-layer': 'poi',
        minzoom: 8,
        maxzoom: 12.8,
        filter: ['all',
          ['!', isNoisy],
          ['any', isTransit, isLandmark, ['<=', rank, 3]]
        ],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2.6, 10, 3.2, 12, 3.8],
          'circle-color': OMT_CLASS_COLOR,
          'circle-stroke-width': 1.2,
          'circle-stroke-color': MARKER_STROKE,
          'circle-opacity': [
            'interpolate', ['linear'], ['zoom'],
            8, 0,
            8.4, 0.85,
            12.3, 0.85,
            12.8, 0
          ],
          'circle-radius-transition': { duration: 340 },
          'circle-opacity-transition': { duration: 400 }
        }
      });
    }

    if (!map.getLayer('mapy_poi_major')) {
      map.addLayer({
        id: 'mapy_poi_major',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'poi',
        minzoom: 13,
        filter: ['all',
          ['match', ['geometry-type'], ['Point', 'MultiPoint'], true, false],
          ['!', isNoisy],
          ['any', isTransit, isLandmark, ['<=', rank, 3]]
        ],
        layout: {
          'icon-image': iconExpr,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 13, 0.55, 13.5, 0.75, 16, 0.9],
          'icon-allow-overlap': false,
          'icon-ignore-placement': false,
          'icon-padding': ['interpolate', ['linear'], ['zoom'], 13, 14, 15, 8, 17, 3],
          'text-field': ['step', ['zoom'], '', 15, nameExpr],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 0.55],
          'text-optional': true,
          'text-allow-overlap': false,
          'text-padding': 4
        },
        paint: {
          'icon-opacity': [
            'interpolate', ['linear'], ['zoom'],
            13, 0,
            13.45, 1
          ],
          'text-opacity': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            15.4, 1
          ],
          'text-color': LABEL_INK,
          'text-halo-color': LABEL_HALO,
          'text-halo-width': LABEL_HALO_W,
          'icon-opacity-transition': { duration: 420 },
          'text-opacity-transition': { duration: 360 }
        }
      });
    }

    if (!map.getLayer('mapy_poi_mid')) {
      map.addLayer({
        id: 'mapy_poi_mid',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'poi',
        minzoom: 15.8,
        filter: ['all',
          ['match', ['geometry-type'], ['Point', 'MultiPoint'], true, false],
          ['!', isNoisy],
          ['!', isTransit],
          ['any',
            isLocalTransit,
            ['match', ['get', 'class'],
              ['cafe', 'restaurant', 'fast_food', 'bar', 'pub', 'shop', 'supermarket', 'mall', 'pharmacy', 'hospital', 'hotel', 'lodging', 'bank'],
              true, false],
            ['all', ['>', rank, 3], ['<=', rank, 8]]
          ]
        ],
        layout: {
          'icon-image': iconExpr,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 15.8, 0.5, 16.3, 0.72, 17, 0.85],
          'icon-allow-overlap': false,
          'icon-padding': ['interpolate', ['linear'], ['zoom'], 15, 10, 17, 3],
          'text-field': ['step', ['zoom'], '', 16, nameExpr],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10.5,
          'text-anchor': 'top',
          'text-offset': [0, 0.55],
          'text-optional': true,
          'text-allow-overlap': false
        },
        paint: {
          'icon-opacity': [
            'interpolate', ['linear'], ['zoom'],
            15.8, 0,
            16.15, 1
          ],
          'text-opacity': [
            'interpolate', ['linear'], ['zoom'],
            16, 0,
            16.35, 1
          ],
          'text-color': LABEL_INK,
          'text-halo-color': LABEL_HALO,
          'text-halo-width': LABEL_HALO_W,
          'icon-opacity-transition': { duration: 400 },
          'text-opacity-transition': { duration: 340 }
        }
      });
    }

    if (!map.getLayer('mapy_poi_minor')) {
      map.addLayer({
        id: 'mapy_poi_minor',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'poi',
        minzoom: 16.5,
        filter: ['all',
          ['match', ['geometry-type'], ['Point', 'MultiPoint'], true, false],
          ['any', ['>', rank, 12], isNoisy]
        ],
        layout: {
          'icon-image': iconExpr,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 16.5, 0.55, 17, 0.75],
          'icon-allow-overlap': false,
          'icon-padding': 4,
          'text-field': ['step', ['zoom'], '', 17, nameExpr],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
          'text-anchor': 'top',
          'text-offset': [0, 0.5],
          'text-optional': true,
          'text-allow-overlap': false
        },
        paint: {
          'icon-opacity': [
            'interpolate', ['linear'], ['zoom'],
            16.5, 0,
            16.85, 1
          ],
          'text-opacity': [
            'interpolate', ['linear'], ['zoom'],
            17, 0,
            17.3, 1
          ],
          'text-color': LABEL_INK,
          'text-halo-color': LABEL_HALO,
          'text-halo-width': Math.max(0.9, LABEL_HALO_W - 0.1),
          'icon-opacity-transition': { duration: 380 },
          'text-opacity-transition': { duration: 320 }
        }
      });
    }

    if (!map.getLayer('mapy_poi_dots')) {
      map.addLayer({
        id: 'mapy_poi_dots',
        type: 'circle',
        source: 'openmaptiles',
        'source-layer': 'poi',
        minzoom: 17,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 17, 2, 18, 3],
          'circle-color': OMT_CLASS_COLOR,
          'circle-stroke-width': 1,
          'circle-stroke-color': MARKER_STROKE,
          'circle-opacity': [
            'interpolate', ['linear'], ['zoom'],
            17, 0,
            17.3, 0.45
          ],
          'circle-radius-transition': { duration: 300 },
          'circle-opacity-transition': { duration: 360 }
        }
      });
    }

    ensurePlacesLayer();
  }

  function omtPlaceType(props){
    const sub = props.subclass || props.subclass_ || '';
    const cls = props.class || props.category || '';
    // OpenMapTiles иногда кладёт тип в разные поля
    const keys = [sub, cls, props.layer, props.type];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k && OMT_CLASS_TO_TYPE[k]) return OMT_CLASS_TO_TYPE[k];
    }
    // эвристики по строке
    var blob = (sub + ' ' + cls).toLowerCase();
    if (/tram|rail|subway|bus|ferry|station|halt|transit|airport|aerodrome|parking/.test(blob)) return 'transit';
    if (/cafe|restaurant|fast_food|bar|pub|biergarten|food/.test(blob)) return 'cafe';
    if (/fuel|charging|gas/.test(blob)) return 'gas_station';
    if (/shop|supermarket|mall|pharmacy|convenience|bakery|clothes/.test(blob)) return 'shop';
    if (/park|garden|pitch|playground|forest|nature/.test(blob)) return 'park';
    return 'custom';
  }

  function typeLabelRu(placeType, props){
    var sub = (props && (props.subclass || props.subclass_)) || '';
    var cls = (props && (props.class || props.category)) || '';
    var key = sub || cls;
    // сначала точная подпись по OSM-классу (трамвай, метро…), не общее «Транспорт/Место»
    if (key && CLASS_LABELS[key]) return CLASS_LABELS[key];
    if (cls && CLASS_LABELS[cls]) return CLASS_LABELS[cls];
    if (placeType && placeType !== 'custom' && TYPE_LABELS[placeType]) {
      return TYPE_LABELS[placeType];
    }
    if (/tram/.test(key + cls)) return 'Трамвай';
    if (/bus/.test(key + cls)) return 'Автобус';
    if (/subway|metro/.test(key + cls)) return 'Метро';
    if (/rail|train|station|halt/.test(key + cls)) return 'Станция';
    if (cls) return humanizeClass(cls);
    return 'Точка на карте';
  }

  function humanizeClass(cls){
    return String(cls || '')
      .replace(/_/g, ' ')
      .replace(/^\w/, function(c){ return c.toUpperCase(); }) || 'Точка на карте';
  }

  const POI_HIT_LAYERS = [
    'mapy_fav_icon',
    'mapy_fav_dots',
    'mapy_places_icon',
    'mapy_places_dots',
    'mapy_poi_far',
    'mapy_poi_dots',
    'mapy_poi_major',
    'mapy_poi_mid',
    'mapy_poi_minor',
    'poi_r1',
    'poi_r7',
    'poi_r20',
    'poi_transit'
  ];

  map.on('load', () => {
    mapReady = true;
    try { map.resize(); } catch (e) {}
    tuneBasemapLabels();
    tuneBasemapStructure();
    tuneLibertyWaterLabels();
    boostPois();
    loadPlaceIcons().then(() => {
      ensurePlacesLayer();
      if (pendingUpdate) { render(pendingUpdate); pendingUpdate = null; }
      else render(latest);
      emitRegion();
      if (pendingFly) {
        map.flyTo({ center: [pendingFly.lon, pendingFly.lat], zoom: pendingFly.zoom != null ? pendingFly.zoom : map.getZoom(), essential: true });
        pendingFly = null;
      }
      POI_HIT_LAYERS.forEach(id => {
        if (!map.getLayer(id)) return;
        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
      });
      setupDesktopHover();
      applyFriendZoomClass();
      ensureTrailLayers();
    });
  });
  setTimeout(function(){ try { map.resize(); } catch(e) {} }, 50);
  setTimeout(function(){ try { map.resize(); } catch(e) {} }, 250);
  setTimeout(function(){ try { map.resize(); } catch(e) {} }, 800);
  window.addEventListener('resize', function(){ try { map.resize(); } catch(e) {} });
  map.on('moveend', function(){ emitRegion(); applyFriendZoomClass(); });
  map.on('zoom', applyFriendZoomClass);
  map.on('zoomend', function(){ applyFriendZoomClass(); pushPlacesToMap(); });
  // Слежение за другом снимается при любом ручном жесте камеры
  map.on('dragstart', stopFollowFriend);
  map.on('boxzoomstart', stopFollowFriend);
  map.on('zoomstart', function(e){ if (e && e.originalEvent) stopFollowFriend(); });
  map.on('rotatestart', function(e){ if (e && e.originalEvent) stopFollowFriend(); });
  map.on('pitchstart', function(e){ if (e && e.originalEvent) stopFollowFriend(); });

  const TYPE_LABELS = {
    cafe: 'Кафе',
    gas_station: 'АЗС',
    shop: 'Магазин',
    transit: 'Транспорт',
    park: 'Парк',
    home: 'Дом',
    custom: 'Точка на карте'
  };
  const CLASS_LABELS = {
    tram: 'Трамвай',
    tram_stop: 'Остановка трамвая',
    bus: 'Автобус',
    bus_stop: 'Остановка',
    bus_station: 'Автовокзал',
    rail: 'Ж/д',
    railway: 'Ж/д',
    station: 'Станция',
    halt: 'Платформа',
    subway: 'Метро',
    subway_entrance: 'Вход в метро',
    ferry: 'Паром',
    ferry_terminal: 'Паром',
    airport: 'Аэропорт',
    aerodrome: 'Аэропорт',
    parking: 'Парковка',
    cafe: 'Кафе',
    restaurant: 'Ресторан',
    fast_food: 'Фастфуд',
    bar: 'Бар',
    pub: 'Паб',
    fuel: 'АЗС',
    charging_station: 'Зарядка',
    shop: 'Магазин',
    supermarket: 'Супермаркет',
    convenience: 'Магазин',
    mall: 'ТЦ',
    pharmacy: 'Аптека',
    bakery: 'Пекарня',
    clothes: 'Одежда',
    park: 'Парк',
    garden: 'Сад',
    playground: 'Площадка',
    pitch: 'Площадка',
    museum: 'Музей',
    cinema: 'Кино',
    theatre: 'Театр',
    attraction: 'Достопримечательность',
    office: 'Офис',
    bank: 'Банк',
    atm: 'Банкомат',
    hospital: 'Больница',
    clinic: 'Клиника',
    school: 'Школа',
    college: 'Колледж',
    university: 'Университет',
    library: 'Библиотека',
    hotel: 'Отель',
    lodging: 'Гостиница',
    post: 'Почта',
    police: 'Полиция',
    town_hall: 'Администрация'
  };
  const TYPE_COLORS_UI = TYPE_COLORS;

  let hoverPopup = null;
  let hoverHideTimer = null;
  let hoverKey = '';
  const canHover = (function(){
    try {
      return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    } catch (e) { return true; }
  })();

  function hitLayers(){
    return POI_HIT_LAYERS.filter(function(id){ return map.getLayer(id); });
  }

  function featurePayload(f, lngLat){
    const props = f.properties || {};
    const layerId = f.layer && f.layer.id;
    const coords = (f.geometry && f.geometry.type === 'Point')
      ? f.geometry.coordinates
      : [lngLat.lng, lngLat.lat];
    const lon = coords[0], lat = coords[1];
    if (layerId === 'mapy_places_icon' || layerId === 'mapy_places_dots') {
      const placeType = props.place_type || 'custom';
      const typeLabel = props.type_label || TYPE_LABELS[placeType] || 'Точка';
      var nm = String(props.name || '').trim();
      if (isBadPlaceName(nm)) {
        nm = typeLabel;
      }
      return {
        kind: 'place',
        id: String(props.id || ''),
        name: nm,
        place_type: placeType,
        type_label: typeLabel,
        color: TYPE_COLORS_UI[placeType] || TYPE_COLORS_UI.custom,
        lat: lat,
        lon: lon,
        key: 'place:' + props.id
      };
    }
    const placeTypeRaw = omtPlaceType(props);
    const cls = props.class || '';
    const sub = props.subclass || '';
    const placeType = placeTypeRaw === 'custom' && /tram|rail|subway|bus|ferry|station|halt|airport|office|bank|hotel|school|hospital/.test((cls + ' ' + sub).toLowerCase())
      ? ( /tram|rail|subway|bus|ferry|station|halt|airport/.test((cls + ' ' + sub).toLowerCase()) ? 'transit' : 'shop')
      : placeTypeRaw;
    const typeLabel = typeLabelRu(placeType, props);
    var name = props.name || props.name_en || props.name_ru || '';
    name = String(name).trim();
    if (isBadPlaceName(name)) {
      name = typeLabel;
    }
    const osm_id = ('omt:' + (cls || 'poi') + ':' + (sub || '-') + ':' + (Math.round(lon*1e5)/1e5) + ':' + (Math.round(lat*1e5)/1e5)).slice(0, 64);
    return {
      kind: 'osm',
      id: osm_id,
      osm_id: osm_id,
      name: name.slice(0, 120),
      place_type: placeType,
      type_label: typeLabel,
      color: TYPE_COLORS_UI[placeType] || TYPE_COLORS_UI.custom,
      lat: lat,
      lon: lon,
      key: 'osm:' + osm_id
    };
  }

  function hoverCardHtml(data){
    var title = data.name;
    var subtitle = data.type_label || '';
    // не дублируем «Кафе / Кафе» или «Место / Место»
    if (subtitle && title && subtitle.toLowerCase() === title.toLowerCase()) {
      subtitle = '';
    }
    return '<div class="hover-card" role="button">'
      + '<div class="hover-dot" style="background:' + data.color + ';box-shadow:0 0 0 3px ' + data.color + '22"></div>'
      + '<div class="hover-body">'
      + '<div class="hover-name">' + esc(title) + '</div>'
      + (subtitle ? '<div class="hover-type">' + esc(subtitle) + '</div>' : '')
      + '<div class="hover-hint">Нажмите, чтобы открыть</div>'
      + '</div></div>';
  }

  function hideHoverSoon(){
    clearTimeout(hoverHideTimer);
    hoverHideTimer = setTimeout(function(){
      hoverKey = '';
      if (hoverPopup) hoverPopup.remove();
    }, 140);
  }

  function cancelHideHover(){
    clearTimeout(hoverHideTimer);
  }

  function flyToPlace(lat, lon){
    map.flyTo({
      center: [lon, lat],
      zoom: Math.max(map.getZoom(), 15.5),
      essential: true,
      speed: 1.2,
      curve: 1.3,
      easing: function(t){ return 1 - Math.pow(1 - t, 3); }
    });
  }

  function openPayload(data){
    cancelHideHover();
    if (hoverPopup) hoverPopup.remove();
    hoverKey = '';
    flyToPlace(data.lat, data.lon);
    if (data.kind === 'place' && data.id) {
      post({ type: 'place', id: data.id });
      return;
    }
    post({
      type: 'osm_poi',
      osm_id: data.osm_id,
      name: data.name,
      place_type: data.place_type,
      lat: data.lat,
      lon: data.lon
    });
  }

  function showHover(lngLat, data){
    if (!canHover) return;
    cancelHideHover();
    if (hoverKey === data.key && hoverPopup) {
      hoverPopup.setLngLat(lngLat);
      return;
    }
    hoverKey = data.key;
    if (!hoverPopup) {
      hoverPopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 16,
        className: 'mapy-hover-popup',
        maxWidth: '280px',
        anchor: 'bottom'
      });
    }
    hoverPopup.setLngLat(lngLat).setHTML(hoverCardHtml(data)).addTo(map);
    var root = hoverPopup.getElement();
    if (!root) return;
    root.onmouseenter = function(){ cancelHideHover(); };
    root.onmouseleave = function(){ hideHoverSoon(); };
    var card = root.querySelector('.hover-card');
    if (card) {
      card.onclick = function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        openPayload(data);
      };
    }
  }

  function setupDesktopHover(){
    if (!canHover) return;
    map.on('mousemove', function(e){
      var layers = hitLayers();
      if (!layers.length) return;
      var feats = map.queryRenderedFeatures(e.point, { layers: layers });
      if (!feats.length) {
        map.getCanvas().style.cursor = '';
        hideHoverSoon();
        return;
      }
      map.getCanvas().style.cursor = 'pointer';
      var data = featurePayload(feats[0], e.lngLat);
      showHover([data.lon, data.lat], data);
    });
    map.on('mouseout', function(){ hideHoverSoon(); });
  }

  map.on('click', (e) => {
    const layers = hitLayers();
    if (!layers.length) return;
    const feats = map.queryRenderedFeatures(e.point, { layers: layers });
    if (!feats.length) return;
    const data = featurePayload(feats[0], e.lngLat);
    openPayload(data);
  });
  window.updateMapyMap = function(next){
    latest = Object.assign({}, latest, next || {});
    render(latest);
    return true;
  };
  window.updateBlinkMap = window.updateMapyMap;
  window.flyMapyMap = function(lat, lon, zoom){
    if (lat == null || lon == null) return false;
    stopFollowFriend();
    if (!mapReady) {
      pendingFly = { lat, lon, zoom };
      return false;
    }
    map.flyTo({
      center: [lon, lat],
      zoom: zoom != null ? zoom : map.getZoom(),
      essential: true,
      speed: 1.15,
      curve: 1.35,
      easing: function(t){ return 1 - Math.pow(1 - t, 3); }
    });
    return true;
  };
  window.flyBlinkMap = window.flyMapyMap;
  window.zoomMapyMap = function(delta){
    if (!mapReady) return false;
    stopFollowFriend();
    map.easeTo({
      zoom: map.getZoom() + (delta || 1),
      duration: 220,
      easing: function(t){ return 1 - Math.pow(1 - t, 3); }
    });
    return true;
  };
  window.zoomBlinkMap = window.zoomMapyMap;
  window.followMapyFriend = function(userId, lat, lon){
    if (!userId || lat == null || lon == null) return false;
    startFollowFriend({ user_id: userId, lat: lat, lon: lon, speed_mps: 0 });
    return true;
  };
</script>
</body>
</html>`;
}

export type MapCanvasHandle = {
  zoomBy: (delta: number) => void;
  flyTo: (lat: number, lon: number, zoom?: number) => void;
  followFriend: (userId: string, lat: number, lon: number) => void;
};

export const MapCanvas = forwardRef<MapCanvasHandle, Props>(function MapCanvas(
  {
    center,
    zoom,
    myLocation,
    friends = [],
    places = [],
    favoriteIds = [],
    onRegionChange,
    onFriendPress,
    onPlacePress,
    onOsmPoiPress,
  },
  ref,
) {
  const { id: themeId, colors } = useTheme();
  const webRef = useRef<{ injectJavaScript?: (js: string) => void } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      zoomBy: (delta: number) => {
        if (Platform.OS === 'web') {
          try {
            const win = iframeRef.current?.contentWindow as
              | (Window & {
                  zoomMapyMap?: (d: number) => boolean;
                  zoomBlinkMap?: (d: number) => boolean;
                })
              | null
              | undefined;
            win?.zoomMapyMap?.(delta) ?? win?.zoomBlinkMap?.(delta);
          } catch {
            // ignore
          }
          return;
        }
        webRef.current?.injectJavaScript?.(
          `window.zoomMapyMap && window.zoomMapyMap(${delta}); true;`,
        );
      },
      flyTo: (lat: number, lon: number, z?: number) => {
        const zoomArg = z != null ? String(z) : 'null';
        if (Platform.OS === 'web') {
          try {
            const win = iframeRef.current?.contentWindow as
              | (Window & {
                  flyMapyMap?: (a: number, b: number, c?: number | null) => boolean;
                  flyBlinkMap?: (a: number, b: number, c?: number | null) => boolean;
                })
              | null
              | undefined;
            win?.flyMapyMap?.(lat, lon, z ?? null) ?? win?.flyBlinkMap?.(lat, lon, z ?? null);
          } catch {
            // ignore
          }
          return;
        }
        webRef.current?.injectJavaScript?.(
          `window.flyMapyMap && window.flyMapyMap(${lat}, ${lon}, ${zoomArg}); true;`,
        );
      },
      followFriend: (userId: string, lat: number, lon: number) => {
        const safeId = JSON.stringify(String(userId));
        if (Platform.OS === 'web') {
          try {
            const win = iframeRef.current?.contentWindow as
              | (Window & {
                  followMapyFriend?: (id: string, a: number, b: number) => boolean;
                })
              | null
              | undefined;
            win?.followMapyFriend?.(userId, lat, lon);
          } catch {
            // ignore
          }
          return;
        }
        webRef.current?.injectJavaScript?.(
          `window.followMapyFriend && window.followMapyFriend(${safeId}, ${lat}, ${lon}); true;`,
        );
      },
    }),
    [],
  );

  const friendsResolved = useMemo(
    () =>
      friends.map((f) => ({
        ...f,
        avatar_url: mediaUrl(f.avatar_url) ?? undefined,
      })),
    [friends],
  );

  const pins = useMemo(() => {
    // Гибрид (Liberty) — светлая подложка: тёмный ink/halo ломает подписи рек и POI
    const darkMap = themeId === 'midnight';
    return {
      friend: colors.pinFriend,
      me: colors.pinMe,
      place: colors.pinPlace,
      canvas: colors.mapCanvas,
      ink: colors.ink,
      surface: colors.surface,
      labelInk: darkMap ? '#F2F5F8' : '#1A1A1A',
      labelHalo: darkMap ? 'rgba(12,16,22,0.78)' : 'rgba(255,255,255,0.92)',
      labelHaloW: darkMap ? 1.0 : 1.2,
      markerStroke: darkMap ? 'rgba(18,22,28,0.92)' : '#ffffff',
      darkMap,
    };
  }, [colors, themeId]);

  const html = useMemo(() => {
    const payload = {
      center,
      zoom,
      myLocation,
      friends: friendsResolved,
      places,
      favoriteIds,
    };
    // Web и native: MapLibre + OpenFreeMap (OSM). На web — blob URL (не srcDoc).
    return buildHtml(payload, themeId, pins);
  },
  // remount on theme; markers via updateMapyMap
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [themeId, pins.friend, pins.me, pins.place, pins.canvas, pins.labelInk, pins.labelHalo, pins.darkMap]);

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [html]);

  useEffect(() => {
    const payload = { myLocation, friends: friendsResolved, places, favoriteIds };
    if (Platform.OS === 'web') {
      try {
        const win = iframeRef.current?.contentWindow as
          | (Window & { updateMapyMap?: (p: unknown) => void; updateBlinkMap?: (p: unknown) => void })
          | null
          | undefined;
        win?.updateMapyMap?.(payload) ?? win?.updateBlinkMap?.(payload);
      } catch {
        // ignore
      }
    } else {
      webRef.current?.injectJavaScript?.(
        `window.updateMapyMap && window.updateMapyMap(${JSON.stringify(payload)}); true;`,
      );
    }
  }, [myLocation, friendsResolved, places, favoriteIds, themeId]);

  // Первая геолокация — подлетаем с ретраями, пока iframe/WebView не готов
  const didFlyRef = useRef(false);
  useEffect(() => {
    if (!myLocation || didFlyRef.current) return;
    const { lat, lon } = myLocation;
    let tries = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      tries += 1;
      let ok = false;
      if (Platform.OS === 'web') {
        try {
          const win = iframeRef.current?.contentWindow as
            | (Window & { flyMapyMap?: (a: number, b: number, c: number) => boolean; flyBlinkMap?: (a: number, b: number, c: number) => boolean })
            | null
            | undefined;
          ok = !!(win?.flyMapyMap?.(lat, lon, 14) ?? win?.flyBlinkMap?.(lat, lon, 14));
        } catch {
          ok = false;
        }
      } else {
        webRef.current?.injectJavaScript?.(
          `window.flyMapyMap && window.flyMapyMap(${lat}, ${lon}, 14); true;`,
        );
        ok = tries >= 4;
      }
      if (ok || tries >= 24) {
        didFlyRef.current = true;
        return;
      }
      setTimeout(tick, 250);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [myLocation, themeId]);

  const handleMessage = (raw: string) => {
    try {
      const msg = JSON.parse(raw) as {
        type: string;
        id?: string;
        bbox?: string;
        center?: { lat: number; lon: number };
        zoom?: number;
        osm_id?: string;
        name?: string;
        place_type?: string;
        lat?: number;
        lon?: number;
      };
      if (msg.type === 'region' && msg.bbox && msg.center && msg.zoom != null) {
        onRegionChange?.(msg.bbox, msg.center, msg.zoom);
      }
      if (msg.type === 'friend' && msg.id) {
        const f = friends.find((x) => x.user_id === msg.id);
        if (f) onFriendPress?.(f);
      }
      if (msg.type === 'place' && msg.id) {
        const p = places.find((x) => x.id === msg.id);
        if (p) onPlacePress?.(p);
      }
      if (
        msg.type === 'osm_poi' &&
        msg.osm_id &&
        msg.name &&
        msg.place_type &&
        msg.lat != null &&
        msg.lon != null
      ) {
        onOsmPoiPress?.({
          osm_id: msg.osm_id,
          name: msg.name,
          place_type: msg.place_type,
          lat: msg.lat,
          lon: msg.lon,
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onMsg = (ev: MessageEvent) => {
      if (typeof ev.data === 'string') handleMessage(ev.data);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friends, places]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.fill, { backgroundColor: colors.mapCanvas }]}>
        {blobUrl ? (
          <iframe
            key={themeId}
            ref={iframeRef}
            title="Mapy карта"
            src={blobUrl}
            style={{
              border: 'none',
              width: '100%',
              height: '100%',
              display: 'block',
              position: 'absolute',
              inset: 0,
            }}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : null}
      </View>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WebView } = require('react-native-webview') as {
    WebView: React.ComponentType<Record<string, unknown>>;
  };

  return (
    <WebView
      key={themeId}
      ref={webRef}
      originWhitelist={['*']}
      source={{ html }}
      style={[styles.fill, { backgroundColor: colors.mapCanvas }]}
      onMessage={(e: { nativeEvent: { data: string } }) => handleMessage(e.nativeEvent.data)}
      javaScriptEnabled
      domStorageEnabled
      allowFileAccess
      mixedContentMode="always"
    />
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1, position: 'relative', overflow: 'hidden' },
});
