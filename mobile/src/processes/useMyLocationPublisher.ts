import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';

import { mapApi } from '../shared/api/endpoints';
import { useMapCameraStore } from '../features/presence/map-camera-store';

const THROTTLE_MS = 4000;

type Loc = { lat: number; lon: number };

export function useMyLocationPublisher(
  enabled: boolean,
  onLocation?: (loc: Loc) => void,
) {
  const lastSent = useRef(0);
  const setCamera = useMapCameraStore((s) => s.setCamera);
  const onLocRef = useRef(onLocation);
  onLocRef.current = onLocation;

  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!cancelled) {
        const loc = { lat: current.coords.latitude, lon: current.coords.longitude };
        setCamera(loc.lat, loc.lon, 14);
        onLocRef.current?.(loc);
        try {
          await mapApi.postLocation({
            lat: loc.lat,
            lon: loc.lon,
            accuracy_m: current.coords.accuracy ?? undefined,
            speed_mps: current.coords.speed ?? undefined,
            heading_deg: current.coords.heading ?? undefined,
            is_moving: (current.coords.speed ?? 0) > 0.5,
          });
          lastSent.current = Date.now();
        } catch {
          // ignore throttle / network
        }
      }

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: THROTTLE_MS,
          distanceInterval: 12,
        },
        async (pos) => {
          const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          onLocRef.current?.(loc);
          const now = Date.now();
          if (now - lastSent.current < THROTTLE_MS) return;
          lastSent.current = now;
          try {
            await mapApi.postLocation({
              lat: loc.lat,
              lon: loc.lon,
              accuracy_m: pos.coords.accuracy ?? undefined,
              speed_mps: pos.coords.speed ?? undefined,
              heading_deg: pos.coords.heading ?? undefined,
              is_moving: (pos.coords.speed ?? 0) > 0.5,
            });
          } catch {
            // ignore
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled, setCamera]);
}
