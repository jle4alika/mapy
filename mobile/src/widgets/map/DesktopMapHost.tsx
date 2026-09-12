import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';

import type { Place } from '../../entities/types';
import { useMapUiStore } from '../../features/map/map-ui-store';
import {
  cacheFriendsSnapshot,
  cachePlacesSnapshot,
  loadFriendsSnapshot,
  loadPlacesForBbox,
  loadPlacesSnapshot,
} from '../../features/presence/offline-cache';
import { useMapCameraStore } from '../../features/presence/map-camera-store';
import { useMyLocationPublisher } from '../../processes/useMyLocationPublisher';
import { mapApi, profileApi } from '../../shared/api/endpoints';
import { space } from '../../shared/ui';
import { useTheme } from '../../shared/ui/ThemeProvider';
import { showError, showToast } from '../../features/notifications/toast-store';
import { MapCanvas, type MapCanvasHandle } from './MapCanvas';
import { MapSideControls } from './MapSideControls';

/**
 * Карта справа на PC — всегда на экране, не перекрывается панелью.
 * Выбор места пишет в map-ui-store → карточка открывается слева.
 */
export function DesktopMapHost() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const mapRef = useRef<MapCanvasHandle>(null);
  const center = useMapCameraStore((s) => s.center);
  const zoom = useMapCameraStore((s) => s.zoom);
  const setCamera = useMapCameraStore((s) => s.setCamera);
  const setSelectedPlace = useMapUiStore((s) => s.setSelectedPlace);
  const requestFocus = useMapUiStore((s) => s.requestFocus);
  const focusRequest = useMapUiStore((s) => s.focusRequest);
  const consumeFocus = useMapUiStore((s) => s.consumeFocus);
  const setPlacesSnapshot = useMapUiStore((s) => s.setPlacesSnapshot);
  const [bbox, setBbox] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lon: number } | null>(null);

  useMyLocationPublisher(
    true,
    useCallback((loc) => {
      setMyLocation(loc);
    }, []),
  );

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        setMyLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setCamera(pos.coords.latitude, pos.coords.longitude, 14);
      } catch (e) {
        showError(e, 'Не удалось определить местоположение');
      }
    })();
  }, [setCamera]);

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
    if (placesQuery.data) setPlacesSnapshot(placesQuery.data);
  }, [placesQuery.data, setPlacesSnapshot]);

  const flyToMe = useCallback(() => {
    if (!myLocation) {
      showToast('Геолокация', 'Местоположение ещё не определено', 'info');
      return;
    }
    mapRef.current?.flyTo(myLocation.lat, myLocation.lon, Math.max(zoom, 15));
  }, [myLocation, zoom]);

  const openPlace = useCallback(
    (place: Place) => {
      setSelectedPlace(place);
      requestFocus(place.lat, place.lon, 15.5);
      router.push('/(main)/map');
    },
    [router, setSelectedPlace, requestFocus],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.mapCanvas }]}>
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
          mapRef.current?.followFriend(friend.user_id, friend.lat, friend.lon);
        }}
        onPlacePress={openPlace}
        onOsmPoiPress={async (poi) => {
          try {
            const place = await mapApi.ensureOsmPlace(poi);
            openPlace(place);
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
        style={[
          styles.controls,
          {
            top: Math.max(insets.top, 12) + 8,
            bottom: 24 + Math.max(insets.bottom, 8),
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  controls: {
    position: 'absolute',
    justifyContent: 'flex-end',
  },
});
