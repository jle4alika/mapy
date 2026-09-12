import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { MAP_CANVAS_BG, MAP_STYLE_POSITRON } from '../../shared/config/mapStyle';

type Props = {
  style?: ViewStyle;
  center?: { lat: number; lon: number };
  zoom?: number;
  interactive?: boolean;
  showDemoMarkers?: boolean;
  muted?: boolean;
};

const MOSCOW = { lat: 55.7558, lon: 37.6173 };

const DEMO_FRIENDS = [
  { name: 'Маша', lat: 55.7582, lon: 37.6215, color: '#E53935' },
  { name: 'Илья', lat: 55.7521, lon: 37.6108, color: '#5C6B7A' },
  { name: 'Катя', lat: 55.761, lon: 37.608, color: '#8E24AA' },
];

const DEMO_PLACES = [
  { letter: 'К', lat: 55.7565, lon: 37.624, color: '#E67E22' },
  { letter: 'А', lat: 55.7518, lon: 37.615, color: '#2E7D32' },
  { letter: 'М', lat: 55.7595, lon: 37.612, color: '#0066FF' },
];

/**
 * Карта лендинга: MapLibre + OpenFreeMap Positron (OSM, без ключа).
 * Тот же светлый light-gray вид, что и в приложении.
 */
function buildLandingMapHtml(opts: {
  center: { lat: number; lon: number };
  zoom: number;
  interactive: boolean;
  showDemoMarkers: boolean;
  muted: boolean;
}) {
  const friends = JSON.stringify(DEMO_FRIENDS);
  const places = JSON.stringify(DEMO_PLACES);
  const pe = opts.interactive ? 'auto' : 'none';
  const opacity = opts.muted ? '0.94' : '1';
  const styleUrl = JSON.stringify(MAP_STYLE_POSITRON);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>
  html, body, #map {
    margin: 0; height: 100%; width: 100%;
    background: ${MAP_CANVAS_BG};
    overflow: hidden;
    pointer-events: ${pe};
    opacity: ${opacity};
  }
  .maplibregl-ctrl-attrib { display: none !important; }
  .maplibregl-ctrl-logo { display: none !important; }
  .pin-wrap { display: flex; flex-direction: column; align-items: center; pointer-events: none; }
</style>
</head>
<body>
<div id="map"></div>
<script>
(function () {
  var center = [${opts.center.lon}, ${opts.center.lat}];
  var zoom = ${opts.zoom};
  var interactive = ${opts.interactive ? 'true' : 'false'};
  var showMarkers = ${opts.showDemoMarkers ? 'true' : 'false'};
  var friends = ${friends};
  var places = ${places};

  var map = new maplibregl.Map({
    container: 'map',
    style: ${styleUrl},
    center: center,
    zoom: zoom,
    interactive: interactive,
    attributionControl: false,
    pitchWithRotate: false,
    dragRotate: false
  });

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }

  map.on('load', function () {
    if (!showMarkers) return;

    friends.forEach(function (f) {
      var html = '<div class="pin-wrap"><div style="width:28px;height:28px;border-radius:50%;border:2.5px solid #fff;background:' + f.color +
        ';color:#fff;font:600 12px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.25)">' +
        f.name.charAt(0) + '</div><div style="margin-top:2px;padding:1px 5px;border-radius:4px;background:rgba(255,255,255,.94);color:#1a1a1a;font:500 10px system-ui,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.1)">' +
        f.name + '</div></div>';
      new maplibregl.Marker({ element: el(html), anchor: 'bottom' })
        .setLngLat([f.lon, f.lat])
        .addTo(map);
    });

    places.forEach(function (p) {
      var html = '<div class="pin-wrap"><div style="width:22px;height:22px;border-radius:50%;border:1.5px solid #fff;background:' + p.color +
        ';color:#fff;font:700 10px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(0,0,0,.22)">' +
        p.letter + '</div><div style="width:0;height:0;margin-top:-1px;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ' +
        p.color + '"></div></div>';
      new maplibregl.Marker({ element: el(html), anchor: 'bottom' })
        .setLngLat([p.lon, p.lat])
        .addTo(map);
    });

    var me = '<div style="position:relative;width:22px;height:22px"><div style="position:absolute;inset:0;border-radius:11px;background:rgba(0,102,255,.22)"></div><div style="position:absolute;left:4px;top:4px;width:14px;height:14px;border-radius:7px;background:#0066FF;border:2.5px solid #fff"></div></div>';
    new maplibregl.Marker({ element: el(me), anchor: 'center' })
      .setLngLat(center)
      .addTo(map);
  });

  function fix() {
    try { map.resize(); } catch (e) {}
  }
  setTimeout(fix, 50);
  setTimeout(fix, 250);
  setTimeout(fix, 800);
  window.addEventListener('resize', fix);
})();
</script>
</body>
</html>`;
}

export function LandingMapView({
  style,
  center = MOSCOW,
  zoom = 14.2,
  interactive = false,
  showDemoMarkers = true,
  muted = false,
}: Props) {
  const html = useMemo(
    () =>
      buildLandingMapHtml({
        center,
        zoom,
        interactive,
        showDemoMarkers,
        muted,
      }),
    [center.lat, center.lon, zoom, interactive, showDemoMarkers, muted],
  );

  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [html]);

  if (Platform.OS !== 'web') {
    return <View style={[styles.root, styles.fallback, style]} />;
  }

  return (
    <View
      style={[styles.root, muted && styles.muted, style]}
      pointerEvents={interactive ? 'auto' : 'none'}
    >
      {blobUrl ? (
        <iframe
          title="Mapy карта"
          src={blobUrl}
          style={{
            border: 'none',
            width: '100%',
            height: '100%',
            display: 'block',
            position: 'absolute',
            inset: 0,
            pointerEvents: interactive ? 'auto' : 'none',
          }}
          sandbox="allow-scripts allow-same-origin"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: MAP_CANVAS_BG,
  },
  muted: { opacity: 0.96 },
  fallback: {
    backgroundColor: MAP_CANVAS_BG,
  },
});
