import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Place, PlaceFavorite } from '../../entities/types';
import { profileApi } from '../../shared/api/endpoints';
import { showError, showToast } from '../../features/notifications/toast-store';
import { Icon, Typography, fonts, radii, space } from '../../shared/ui';
import { useTheme } from '../../shared/ui/ThemeProvider';
import { placeDisplayName, placeTypeColor, placeTypeIcon, placeTypeLabel } from './placeMeta';

type Props = {
  place: Place;
  onOpenChat: () => void;
  onClose: () => void;
  /** Встроенная карточка в левой панели (не bottom sheet) */
  embedded?: boolean;
};

const STAR_YELLOW = '#F5C400';

/** Карточка места: на мобилке sheet, на PC — блок внутри левой панели */
export function PlaceCard({ place, onOpenChat, onClose, embedded }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const typeColor = placeTypeColor(place.place_type);
  const typeIcon = placeTypeIcon(place.place_type);
  const title = placeDisplayName(place.name, place.place_type);
  const typeLabel = placeTypeLabel(place.place_type);
  const metaBits = [
    title.toLowerCase() === typeLabel.toLowerCase() ? null : typeLabel,
    place.address_text || null,
  ].filter(Boolean);

  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: () => profileApi.favorites(),
  });
  const placeId = String(place.id);
  const isFavorite = (favoritesQuery.data ?? []).some(
    (f) => String(f.place_id) === placeId || String(f.place?.id ?? '') === placeId,
  );

  const toggleFav = useMutation({
    mutationFn: async (makeFavorite: boolean) => {
      if (makeFavorite) {
        await profileApi.addFavorite(placeId);
        return true;
      }
      await profileApi.removeFavorite(placeId);
      return false;
    },
    onMutate: async (makeFavorite) => {
      await qc.cancelQueries({ queryKey: ['favorites'] });
      const prev = qc.getQueryData<PlaceFavorite[]>(['favorites']);
      qc.setQueryData<PlaceFavorite[]>(['favorites'], (old = []) => {
        if (!makeFavorite) {
          return old.filter(
            (f) => String(f.place_id) !== placeId && String(f.place?.id ?? '') !== placeId,
          );
        }
        if (old.some((f) => String(f.place_id) === placeId || String(f.place?.id ?? '') === placeId)) {
          return old;
        }
        return [
          ...old,
          { place_id: placeId, place, created_at: new Date().toISOString() },
        ];
      });
      return { prev };
    },
    onSuccess: (nowFav) => {
      showToast('Избранное', nowFav ? 'Добавлено в избранное' : 'Убрано из избранного', 'info');
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['favorites'], ctx.prev);
      showError(e, 'Не удалось обновить избранное');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  return (
    <View
      style={[
        embedded ? styles.embedded : styles.sheet,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          ...(embedded ? null : { paddingBottom: Math.max(insets.bottom, 10) + 14 }),
        },
      ]}
      accessibilityViewIsModal={!embedded}
    >
      {!embedded ? <View style={[styles.handle, { backgroundColor: colors.border }]} /> : null}
      <View style={styles.top}>
        <View style={[styles.typeMark, { backgroundColor: typeColor }]}>
          <Icon name={typeIcon} pack="fi" size={15} color="#fff" />
        </View>
        <View style={styles.head}>
          <Typography variant="h3" color={colors.ink} numberOfLines={2}>
            {title}
          </Typography>
          <View style={styles.metaRow}>
            <Icon name="pin" pack="fi" size={12} color={colors.inkMuted} />
            <Typography
              variant="caption"
              color={colors.inkMuted}
              numberOfLines={2}
              style={{ flex: 1 }}
            >
              {metaBits.join(' · ') || typeLabel}
            </Typography>
          </View>
        </View>
        <Pressable
          onPress={() => toggleFav.mutate(!isFavorite)}
          hitSlop={10}
          disabled={toggleFav.isPending}
          accessibilityLabel={isFavorite ? 'убрать из избранного' : 'в избранное'}
          style={[
            styles.iconBtn,
            {
              backgroundColor: isFavorite ? '#FFF8E0' : colors.surfaceMuted,
            },
          ]}
        >
          <Icon name="star" pack="fi" size={16} color={isFavorite ? STAR_YELLOW : colors.inkMuted} />
        </Pressable>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityLabel="закрыть"
          style={[styles.iconBtn, { backgroundColor: colors.surfaceMuted }]}
        >
          <Icon name="close" pack="fi" size={15} color={colors.inkMuted} />
        </Pressable>
      </View>

      <Pressable
        onPress={onOpenChat}
        style={({ pressed }) => [
          styles.primaryBtn,
          { backgroundColor: colors.accent, opacity: pressed ? 0.88 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="открыть чат"
      >
        <Icon name="chats" pack="fi" size={15} color={colors.accentText} />
        <Typography style={styles.ctaText} color={colors.accentText}>
          Чат места
        </Typography>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: 0,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: space.md,
  },
  embedded: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    gap: space.md,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 6,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  typeMark: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  head: { flex: 1, gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    height: 46,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
