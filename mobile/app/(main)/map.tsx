import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';

import type { Place } from '../../src/entities/types';
import { useMapUiStore } from '../../src/features/map/map-ui-store';
import {
  cacheFriendsSnapshot,
  cachePlacesSnapshot,
  loadFriendsSnapshot,
  loadPlacesForBbox,
  loadPlacesSnapshot,
} from '../../src/features/presence/offline-cache';
import { useMapCameraStore } from '../../src/features/presence/map-camera-store';
import { useMyLocationPublisher } from '../../src/processes/useMyLocationPublisher';
import { chatsApi, mapApi, profileApi } from '../../src/shared/api/endpoints';
import { useSideNav } from '../../src/shared/hooks/useBreakpoint';
import { space } from '../../src/shared/ui';
import { useTheme } from '../../src/shared/ui/ThemeProvider';
import { showError, showToast } from '../../src/features/notifications/toast-store';
import { ActivityStrip } from '../../src/widgets/map/ActivityStrip';
import { MapCanvas, type MapCanvasHandle } from '../../src/widgets/map/MapCanvas';
import { MapDesktopPanel } from '../../src/widgets/map/MapDesktopPanel';
import { MapSideControls } from '../../src/widgets/map/MapSideControls';
import { MapTopBar } from '../../src/widgets/map/MapTopBar';
import { PlaceCard } from '../../src/widgets/map/PlaceCard';

export default function MapScreen() {
  const side = useSideNav();
  // На PC карта справа (DesktopMapHost); здесь только левая панель раздела
  if (side) return <MapDesktopPanel />;
  return <MapMobileScreen />;
}

function MapMobileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const mapRef = useRef<MapCanvasHandle>(null);
  const center = useMapCameraStore((s) => s.center);
  const zoom = useMapCameraStore((s) => s.zoom);
  const setCamera = useMapCameraStore((s) => s.setCamera);
  const selectedPlace = useMapUiStore((s) => s.selectedPlace);
  const setSelectedPlace = useMapUiStore((s) => s.setSelectedPlace);
  const focusRequest = useMapUiStore((s) => s.focusRequest);
  const consumeFocus = useMapUiStore((s) => s.consumeFocus);
  const [bbox, setBbox] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lon: number } | null>(null);

  useMyLocationPublisher(
    true,
    useCallback((loc: { lat: number; lon: number }) => {
      setMyLocation(loc);
    }, []),
  );

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.followUserId) {
      mapRef.current?.followFriend(
        focusRequest.followUserId,
        focusRequest.lat,
        focusRequest.lon,
      );
    } else {
      mapRef.current?.flyTo(
        focusRequest.lat,
        focusRequest.lon,
        focusRequest.zoom ?? Math.max(zoom, 16),
      );
    }
    consumeFocus();
  }, [focusRequest, consumeFocus, zoom]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          showToast(
            'Геолокация',
            'Нет доступа к геолокации. Разрешите её в настройках, чтобы видеть себя на карте.',
            'info',
          );
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setMyLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setCamera(pos.coords.latitude, pos.coords.longitude, 14);
      } catch (e) {
        showError(e, 'Не удалось определить местоположение');
      }
    })();
  }, [setCamera]);

  const friendsQuery = useQuery({
    queryKey: ['map', 'friends'],
    queryFn: async () => {
      try {
        const data = await mapApi.friends();
        await cacheFriendsSnapshot(data);
        return data;
      } catch (e) {
        const cached = await loadFriendsSnapshot();
        if (cached) return cached;
        throw e;
      }
    },
    refetchInterval: 30_000,
  });

  const placesQuery = useQuery({
    queryKey: ['map', 'places', bbox],
    enabled: !!bbox,
    queryFn: async () => {
      try {
        const data = await mapApi.places(bbox!);
        await cachePlacesSnapshot(data, bbox);
        return data;
      } catch (e) {
        const regional = await loadPlacesForBbox(bbox!);
        if (regional.length) return regional;
        const cached = await loadPlacesSnapshot();
        if (cached) return cached;
        throw e;
      }
    },
  });

  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: () => profileApi.favorites(),
  });

  const favoriteIds = useMemo(
    () => (favoritesQuery.data ?? []).map((f) => f.place_id),
    [favoritesQuery.data],
  );

  const placesForMap = useMemo(() => {
    const byId = new Map<string, Place>();
    for (const p of placesQuery.data ?? []) byId.set(p.id, p);
    for (const f of favoritesQuery.data ?? []) {
      if (f.place?.lat != null && f.place?.lon != null) byId.set(f.place.id, f.place);
    }
    return [...byId.values()];
  }, [placesQuery.data, favoritesQuery.data]);

  useEffect(() => {
    if (!bbox) return;
    let cancelled = false;
    (async () => {
      const offline = await loadPlacesForBbox(bbox);
      if (cancelled || !offline.length) return;
      qc.setQueryData<Place[]>(['map', 'places', bbox], (old) => {
        if (old && old.length >= offline.length) return old;
        const map = new Map<string, Place>();
        for (const p of offline) map.set(p.id, p);
        for (const p of old ?? []) map.set(p.id, p);
        return [...map.values()];
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [bbox, qc]);

  const activityQuery = useQuery({
    queryKey: ['map', 'activity'],
    queryFn: () => mapApi.activity(),
    refetchInterval: 20_000,
  });

  const flyToMe = useCallback(() => {
    if (!myLocation) return;
    mapRef.current?.flyTo(myLocation.lat, myLocation.lon, Math.max(zoom, 15));
  }, [myLocation, zoom]);

  return (
    <View style={[styles.root, { backgroundColor: colors.mapCanvas }]}>
      <StatusBar style={colors.id === 'day' ? 'dark' : 'light'} />
      <MapCanvas
        ref={mapRef}
        center={center}
        zoom={zoom}
        myLocation={myLocation}
        friends={friendsQuery.data ?? []}
        places={placesForMap}
        favoriteIds={favoriteIds}
        onRegionChange={(nextBbox, nextCenter, nextZoom) => {
          setBbox(nextBbox);
          setCamera(nextCenter.lat, nextCenter.lon, nextZoom);
        }}
        onFriendPress={(friend) => {
          // Слежение уже стартует внутри карты по клику; дублируем для надёжности
          mapRef.current?.followFriend(friend.user_id, friend.lat, friend.lon);
        }}
        onPlacePress={(place) => setSelectedPlace(place)}
        onOsmPoiPress={async (poi) => {
          try {
            const place = await mapApi.ensureOsmPlace(poi);
            setSelectedPlace(place);
            qc.setQueryData<Place[]>(['map', 'places', bbox], (old) => {
              if (!old) return [place];
              if (old.some((p) => p.id === place.id)) return old;
              return [...old, place];
            });
          } catch (e) {
            showError(e, 'Не удалось открыть место');
          }
        }}
      />

      <View
        pointerEvents="box-none"
        style={[styles.overlayTop, { paddingTop: Math.max(insets.top, 10) + 6 }]}
      >
        <MapTopBar />
        <ActivityStrip
          items={activityQuery.data ?? []}
          onPressItem={(item) => {
            const friend = (friendsQuery.data ?? []).find((f) => f.user_id === item.user_id);
            if (!friend) return;
            mapRef.current?.followFriend(friend.user_id, friend.lat, friend.lon);
          }}
        />
      </View>

      <View
        pointerEvents="box-none"
        style={[
          styles.overlayRight,
          {
            top: Math.max(insets.top, 10) + 64,
            bottom: selectedPlace ? 168 : 24 + Math.max(insets.bottom, 8),
            right: space.md,
          },
        ]}
      >
        <MapSideControls
          onZoomIn={() => mapRef.current?.zoomBy(1)}
          onZoomOut={() => mapRef.current?.zoomBy(-1)}
          onLocate={flyToMe}
        />
      </View>

      {selectedPlace ? (
        <PlaceCard
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onOpenChat={async () => {
            try {
              const chat = await chatsApi.openPlaceChat(selectedPlace.id);
              setSelectedPlace(null);
              router.push(`/(main)/chats/${chat.id}`);
            } catch (e) {
              showError(e, 'Не удалось открыть чат места');
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlayTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: space.md,
    gap: 8,
  },
  overlayRight: {
    position: 'absolute',
    justifyContent: 'flex-end',
  },
});
