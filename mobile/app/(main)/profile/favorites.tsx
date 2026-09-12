import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { profileApi } from '../../../src/shared/api/endpoints';
import { useMapUiStore } from '../../../src/features/map/map-ui-store';
import { showError, showToast } from '../../../src/features/notifications/toast-store';
import {
  Icon,
  Screen,
  Typography,
  createShadow,
  fonts,
  radii,
  space,
} from '../../../src/shared/ui';
import { useTheme } from '../../../src/shared/ui/ThemeProvider';
import {
  placeDisplayName,
  placeTypeColor,
  placeTypeIcon,
  placeTypeLabel,
} from '../../../src/widgets/map/placeMeta';

const STAR_YELLOW = '#F5C400';

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const setSelectedPlace = useMapUiStore((s) => s.setSelectedPlace);
  const requestFocus = useMapUiStore((s) => s.requestFocus);

  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: () => profileApi.favorites(),
  });

  const removeFav = useMutation({
    mutationFn: (placeId: string) => profileApi.removeFavorite(placeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
      showToast('Избранное', 'Убрано из избранного', 'info');
    },
    onError: (e) => showError(e, 'Не удалось убрать из избранного'),
  });

  const items = favoritesQuery.data ?? [];

  return (
    <Screen scroll>
      <Typography variant="caption" color={colors.inkMuted} style={{ marginBottom: space.md }}>
        Добавляйте места звёздочкой на карте — они останутся здесь и будут видны на карте
      </Typography>

      {favoritesQuery.isLoading ? (
        <Typography color={colors.inkMuted}>Загрузка…</Typography>
      ) : items.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface }, createShadow('soft')]}>
          <Icon name="star" pack="fi" size={28} color={STAR_YELLOW} />
          <Typography variant="bodyMedium" color={colors.ink} style={{ textAlign: 'center' }}>
            Пока пусто
          </Typography>
          <Typography color={colors.inkMuted} style={{ textAlign: 'center' }}>
            Откройте место на карте и нажмите звёздочку
          </Typography>
          <Pressable
            onPress={() => router.push('/(main)/map')}
            style={({ pressed }) => [
              styles.mapBtn,
              { backgroundColor: colors.accent, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Icon name="map" pack="fi" size={15} color={colors.accentText} />
            <Typography style={styles.mapBtnText} color={colors.accentText}>
              На карту
            </Typography>
          </Pressable>
        </View>
      ) : (
        items.map((f) => {
          const place = f.place;
          if (!place) return null;
          const title = placeDisplayName(place.name, place.place_type);
          const typeColor = placeTypeColor(place.place_type);
          const typeIcon = placeTypeIcon(place.place_type);
          return (
            <Pressable
              key={f.place_id}
              onPress={() => {
                setSelectedPlace(place);
                requestFocus(place.lat, place.lon, 15.5);
                router.push('/(main)/map');
              }}
              style={({ pressed }) => [
                styles.row,
                createShadow('soft'),
                {
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <View style={[styles.typeMark, { backgroundColor: typeColor }]}>
                <Icon name={typeIcon} pack="fi" size={14} color="#fff" />
              </View>
              <View style={styles.head}>
                <Typography variant="bodyMedium" color={colors.ink} numberOfLines={1}>
                  {title}
                </Typography>
                <Typography variant="caption" color={colors.inkMuted} numberOfLines={1}>
                  {[placeTypeLabel(place.place_type), place.address_text].filter(Boolean).join(' · ')}
                </Typography>
              </View>
              <Pressable
                onPress={() => removeFav.mutate(f.place_id)}
                hitSlop={10}
                accessibilityLabel="убрать из избранного"
                style={[styles.starBtn, { backgroundColor: '#FFF8E0' }]}
              >
                <Icon name="star" pack="fi" size={16} color={STAR_YELLOW} />
              </Pressable>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    borderRadius: radii.xl,
    padding: space.xl,
    gap: space.sm,
    alignItems: 'center',
  },
  mapBtn: {
    marginTop: space.md,
    height: 44,
    paddingHorizontal: space.lg,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapBtnText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.xl,
    padding: space.md,
    marginBottom: space.sm,
  },
  typeMark: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: { flex: 1, gap: 2 },
  starBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
