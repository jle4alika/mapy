import React, { useMemo } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import type { Place } from '../../entities/types';
import { useMapUiStore } from '../../features/map/map-ui-store';
import { useMapCameraStore } from '../../features/presence/map-camera-store';
import { chatsApi, mapApi, profileApi } from '../../shared/api/endpoints';
import { formatFriendPresence } from '../../features/presence/friendPresence';
import { Avatar, Icon, type IconName, Typography, fonts, radii, space } from '../../shared/ui';
import { useTheme } from '../../shared/ui/ThemeProvider';
import { showError } from '../../features/notifications/toast-store';
import { PlaceCard } from './PlaceCard';
import {
  PLACE_TYPE_META,
  placeTypeColor,
  placeTypeIcon,
  placeTypeLabel,
  placeDisplayName,
} from './placeMeta';

const CATEGORIES: { type: string; label: string; color: string; icon: IconName }[] = [
  { type: 'gas_station', label: 'АЗС', color: PLACE_TYPE_META.gas_station.color, icon: 'gas' },
  { type: 'cafe', label: 'Где поесть', color: PLACE_TYPE_META.cafe.color, icon: 'cafe' },
  { type: 'shop', label: 'Магазины', color: PLACE_TYPE_META.shop.color, icon: 'shop' },
  { type: 'transit', label: 'Транспорт', color: PLACE_TYPE_META.transit.color, icon: 'transit' },
  { type: 'park', label: 'Парки', color: PLACE_TYPE_META.park.color, icon: 'park' },
  { type: 'favorites', label: 'Избранное', color: '#F5C400', icon: 'star' },
];

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function dist2(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dy = a.lat - b.lat;
  const dx = (a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180);
  return dy * dy + dx * dx;
}

function PlaceRow({ place, onPress }: { place: Place; onPress: () => void }) {
  const { colors } = useTheme();
  const c = placeTypeColor(place.place_type);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.placeCard,
        {
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.markLg, { backgroundColor: c }]}>
        <Icon name={placeTypeIcon(place.place_type)} pack="fi" size={18} color="#fff" />
      </View>
      <View style={styles.placeText}>
        <Typography
          style={{ fontFamily: fonts.bodyBold, fontSize: 15, letterSpacing: -0.2 }}
          color={colors.ink}
          numberOfLines={1}
        >
          {placeDisplayName(place.name, place.place_type)}
        </Typography>
        <Typography variant="caption" color={colors.inkMuted} numberOfLines={1}>
          {[placeTypeLabel(place.place_type), place.address_text || null].filter(Boolean).join(' · ')}
        </Typography>
      </View>
      {place.has_chat ? (
        <View style={[styles.chatPill, { backgroundColor: colors.accentSoft }]}>
          <Icon name="chats" pack="fi" size={12} color={colors.accent} />
        </View>
      ) : null}
    </Pressable>
  );
}

function CategoryGrid({
  active,
  onSelect,
}: {
  active: string | null;
  onSelect: (type: string | null) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.catGrid}>
      {CATEGORIES.map((cat) => {
        const on = active === cat.type;
        return (
          <Pressable
            key={cat.type}
            onPress={() => onSelect(on ? null : cat.type)}
            style={styles.catItem}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <View
              style={[
                styles.catCircle,
                {
                  backgroundColor: on ? cat.color : `${cat.color}18`,
                  borderWidth: on ? 0 : 0,
                },
              ]}
            >
              <Icon name={cat.icon} pack="fi" size={18} color={on ? '#fff' : cat.color} />
            </View>
            <Typography
              style={styles.catLabel}
              color={on ? colors.ink : colors.inkMuted}
              numberOfLines={2}
            >
              {cat.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Контент раздела «Карта» в левой панели PC */
export function MapDesktopPanel() {
  const { colors } = useTheme();
  const router = useRouter();
  const searchQuery = useMapUiStore((s) => s.searchQuery);
  const selectedPlace = useMapUiStore((s) => s.selectedPlace);
  const setSelectedPlace = useMapUiStore((s) => s.setSelectedPlace);
  const requestFocus = useMapUiStore((s) => s.requestFocus);
  const allPlaces = useMapUiStore((s) => s.placesSnapshot);
  const placeTypeFilter = useMapUiStore((s) => s.placeTypeFilter);
  const setPlaceTypeFilter = useMapUiStore((s) => s.setPlaceTypeFilter);
  const center = useMapCameraStore((s) => s.center);
  const zoom = useMapCameraStore((s) => s.zoom);

  const activityQuery = useQuery({
    queryKey: ['map', 'activity'],
    queryFn: () => mapApi.activity(),
    refetchInterval: 20_000,
  });

  const friendsQuery = useQuery({
    queryKey: ['map', 'friends'],
    queryFn: () => mapApi.friends(),
    refetchInterval: 30_000,
  });

  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: () => profileApi.favorites(),
  });

  const favoriteIds = useMemo(
    () => new Set((favoritesQuery.data ?? []).map((f) => f.place_id)),
    [favoritesQuery.data],
  );

  const q = normalize(searchQuery);

  const viewportPlaces = useMemo(() => {
    let list = [...allPlaces];
    if (placeTypeFilter === 'favorites') {
      const byId = new Map(list.map((p) => [p.id, p]));
      for (const f of favoritesQuery.data ?? []) {
        if (f.place?.lat != null && f.place?.lon != null) byId.set(f.place.id, f.place);
      }
      list = [...byId.values()].filter((p) => favoriteIds.has(p.id));
    } else if (placeTypeFilter) {
      list = list.filter((p) => p.place_type === placeTypeFilter);
    }
    list.sort((a, b) => dist2(a, center) - dist2(b, center));
    return list.slice(0, 80);
  }, [allPlaces, center, placeTypeFilter, favoriteIds, favoritesQuery.data]);

  const placeHits = useMemo(() => {
    if (!q) return [];
    return allPlaces
      .filter(
        (p) =>
          normalize(p.name).includes(q) ||
          normalize(p.address_text ?? '').includes(q) ||
          normalize(placeTypeLabel(p.place_type)).includes(q),
      )
      .slice(0, 40);
  }, [allPlaces, q]);

  const friendHits = useMemo(() => {
    if (!q) return [];
    return (friendsQuery.data ?? [])
      .filter(
        (f) =>
          normalize(f.username ?? '').includes(q) ||
          normalize(f.display_name ?? '').includes(q),
      )
      .slice(0, 20);
  }, [friendsQuery.data, q]);

  const openPlace = (p: Place) => {
    setSelectedPlace(p);
    requestFocus(p.lat, p.lon, 16);
  };

  const filterLabel = placeTypeFilter
    ? placeTypeFilter === 'favorites'
      ? 'Избранное'
      : PLACE_TYPE_META[placeTypeFilter]?.label ?? 'Места'
    : 'Все места';

  if (selectedPlace) {
    return (
      <ScrollView
        style={[styles.root, { backgroundColor: colors.surface }]}
        contentContainerStyle={styles.pad}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => setSelectedPlace(null)}
          style={styles.backRow}
          hitSlop={8}
          accessibilityLabel="к списку мест"
        >
          <Icon name="back" pack="fi" size={16} color={colors.accent} />
          <Typography style={{ fontFamily: fonts.bodyBold }} color={colors.accent}>
            К списку мест
          </Typography>
        </Pressable>
        <PlaceCard
          embedded
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
      </ScrollView>
    );
  }

  if (q) {
    const rows = [
      ...friendHits.map((f) => ({ kind: 'friend' as const, id: f.user_id, friend: f })),
      ...placeHits.map((p) => ({ kind: 'place' as const, id: p.id, place: p })),
    ];
    return (
      <FlatList
        style={[styles.root, { backgroundColor: colors.surface }]}
        contentContainerStyle={styles.pad}
        data={rows}
        keyExtractor={(i) => `${i.kind}-${i.id}`}
        ListHeaderComponent={
          <View style={styles.headBlock}>
            <Typography variant="h2" color={colors.ink}>
              Результаты
            </Typography>
            <Typography variant="caption" color={colors.inkMuted}>
              {rows.length ? `${rows.length} совпадений` : 'Ничего не найдено'}
            </Typography>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Typography color={colors.inkMuted} style={{ textAlign: 'center' }}>
              Попробуйте другое название
            </Typography>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          if (item.kind === 'friend') {
            const f = item.friend;
            return (
              <Pressable
                style={[styles.placeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => requestFocus(f.lat, f.lon, 16, f.user_id)}
              >
                <Avatar
                  uri={f.avatar_url}
                  name={f.display_name || f.username}
                  size={40}
                />
                <View style={styles.placeText}>
                  <Typography style={{ fontFamily: fonts.bodyBold }} color={colors.ink} numberOfLines={1}>
                    {f.display_name || f.username}
                  </Typography>
                  <Typography variant="caption" color={colors.inkMuted} numberOfLines={1}>
                    {formatFriendPresence(f)}
                  </Typography>
                </View>
              </Pressable>
            );
          }
          return <PlaceRow place={item.place} onPress={() => openPlace(item.place)} />;
        }}
      />
    );
  }

  const activity = activityQuery.data ?? [];

  return (
    <FlatList
      style={[styles.root, { backgroundColor: colors.surface }]}
      contentContainerStyle={styles.pad}
      data={viewportPlaces}
      keyExtractor={(p) => p.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 18, marginBottom: 8 }}>
          <View style={styles.headRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Typography variant="h2" color={colors.ink}>
                На карте
              </Typography>
              <Typography variant="caption" color={colors.inkMuted}>
                Масштаб {zoom.toFixed(1)} · {viewportPlaces.length} мест
              </Typography>
            </View>
            {placeTypeFilter ? (
              <Pressable onPress={() => setPlaceTypeFilter(null)} hitSlop={8}>
                <Typography style={{ fontFamily: fonts.bodyMedium }} color={colors.accent}>
                  Сбросить
                </Typography>
              </Pressable>
            ) : (
              <Typography variant="caption" color={colors.inkMuted}>
                {filterLabel}
              </Typography>
            )}
          </View>

          <CategoryGrid active={placeTypeFilter} onSelect={setPlaceTypeFilter} />

          {activity.length ? (
            <View style={[styles.friendsStrip, { backgroundColor: colors.surfaceMuted }]}>
              <Typography variant="overline" color={colors.inkMuted} style={{ marginBottom: 8 }}>
                Друзья рядом
              </Typography>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {activity.slice(0, 8).map((item) => {
                  const friend = (friendsQuery.data ?? []).find((f) => f.user_id === item.user_id);
                  const name = item.username ?? 'друг';
                  const moving = item.derived_status === 'moving';
                  const status = friend ? formatFriendPresence(friend) : moving ? 'В пути' : 'На месте';
                  return (
                    <Pressable
                      key={`${item.user_id}-${item.recorded_at}`}
                      style={[styles.friendChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => {
                        if (!friend) return;
                        requestFocus(friend.lat, friend.lon, 16, friend.user_id);
                      }}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: moving ? colors.accent : colors.success },
                        ]}
                      />
                      <View style={{ minWidth: 0, maxWidth: 120 }}>
                        <Typography variant="caption" color={colors.ink} numberOfLines={1}>
                          {name}
                        </Typography>
                        <Typography
                          style={{ fontSize: 10, lineHeight: 12, fontFamily: fonts.bodyMedium }}
                          color={colors.inkMuted}
                          numberOfLines={1}
                        >
                          {status}
                        </Typography>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <Typography
            style={{ fontFamily: fonts.displaySemi, fontSize: 16, letterSpacing: -0.4 }}
            color={colors.ink}
          >
            {placeTypeFilter ? filterLabel : 'Рекомендации'}
          </Typography>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Icon name="pin" pack="fi" size={24} color={colors.inkMuted} />
          <Typography
            style={{ fontFamily: fonts.bodyBold, marginTop: 10, textAlign: 'center' }}
            color={colors.ink}
          >
            Нет мест в области
          </Typography>
          <Typography color={colors.inkMuted} style={{ textAlign: 'center', marginTop: 4 }}>
            Приблизьте карту или смените фильтр
          </Typography>
        </View>
      }
      renderItem={({ item }) => <PlaceRow place={item} onPress={() => openPlace(item)} />}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xxxl },
  headBlock: { gap: 4, marginBottom: 14 },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: space.md,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catItem: {
    width: '30%',
    flexGrow: 1,
    maxWidth: '33%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  catCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  placeText: { flex: 1, gap: 2, minWidth: 0 },
  markLg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsStrip: {
    borderRadius: radii.xl,
    padding: 12,
  },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 168,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  empty: {
    paddingVertical: 36,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
});
