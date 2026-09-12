import React, { useMemo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { FriendLocation } from '../../../src/entities/types';
import { chatsApi, friendsApi, mapApi } from '../../../src/shared/api/endpoints';
import { showError } from '../../../src/features/notifications/toast-store';
import { useSessionStore } from '../../../src/features/auth/session-store';
import { useMapUiStore } from '../../../src/features/map/map-ui-store';
import {
  formatFriendPresence,
  friendPresenceClickable,
} from '../../../src/features/presence/friendPresence';
import {
  Button,
  FriendPin,
  Icon,
  Typography,
  createShadow,
  radii,
  space,
  webScrollProps,
} from '../../../src/shared/ui';
import { useTheme } from '../../../src/shared/ui/ThemeProvider';
import { AppPage, useListContentStyle } from '../../../src/widgets/shell/AppPage';

export default function FriendsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const listStyle = useListContentStyle({ paddingBottom: space.xxxl, paddingTop: space.lg });
  const me = useSessionStore((s) => s.user?.id);
  const qc = useQueryClient();
  const requestFocus = useMapUiStore((s) => s.requestFocus);

  const friendsQuery = useQuery({ queryKey: ['friends'], queryFn: () => friendsApi.list() });
  const requestsQuery = useQuery({
    queryKey: ['friends', 'requests'],
    queryFn: () => friendsApi.requests(),
  });
  const locationsQuery = useQuery({
    queryKey: ['map', 'friends'],
    queryFn: () => mapApi.friends(),
    refetchInterval: 20_000,
  });

  const locationById = useMemo(() => {
    const map = new Map<string, FriendLocation>();
    for (const f of locationsQuery.data ?? []) map.set(f.user_id, f);
    return map;
  }, [locationsQuery.data]);

  const incoming = useMemo(
    () => (requestsQuery.data ?? []).filter((r) => r.status === 'pending' && r.to_user_id === me),
    [requestsQuery.data, me],
  );
  const outgoing = useMemo(
    () => (requestsQuery.data ?? []).filter((r) => r.status === 'pending' && r.from_user_id === me),
    [requestsQuery.data, me],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['friends'] });
  };

  const cardStyle = [styles.card, createShadow('soft'), { backgroundColor: colors.surface }];

  return (
    <AppPage fullBleed>
      <FlatList
        {...webScrollProps}
        data={friendsQuery.data ?? []}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={listStyle}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.headingRow}>
              <Typography variant="h2" color={colors.ink} style={styles.heading}>
                Друзья
              </Typography>
              <Pressable
                onPress={() => router.push('/(main)/friends/visibility')}
                style={[styles.visBtn, { backgroundColor: colors.surfaceMuted }]}
                accessibilityLabel="видимость"
              >
                <Icon name="eye" pack="fi" size={15} color={colors.inkMuted} />
              </Pressable>
            </View>

            <Pressable
              onPress={() => router.push('/(main)/profile')}
              style={({ pressed }) => [
                styles.hintCard,
                createShadow('soft'),
                { backgroundColor: colors.surface, opacity: pressed ? 0.92 : 1 },
              ]}
            >
              <View style={[styles.hintIcon, { backgroundColor: colors.accentSoft }]}>
                <Icon name="userPlus" pack="fi" size={16} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Typography variant="bodyMedium" color={colors.ink}>
                  Добавить друзей
                </Typography>
                <Typography variant="caption" color={colors.inkMuted}>
                  Поиск по нику или ссылка — в профиле
                </Typography>
              </View>
              <Icon name="forward" pack="fi" size={16} color={colors.inkMuted} />
            </Pressable>

            {incoming.length ? (
              <View style={styles.section}>
                <View style={styles.sectionTitle}>
                  <Icon name="bell" pack="fi" size={14} color={colors.inkMuted} />
                  <Typography variant="bodyMedium" color={colors.inkMuted}>
                    Входящие
                  </Typography>
                </View>
                {incoming.map((r) => (
                  <View key={r.id} style={cardStyle}>
                    <Typography variant="bodySmall" color={colors.inkMuted}>
                      Входящая заявка
                    </Typography>
                    <View style={styles.actions}>
                      <Button
                        title="Принять"
                        icon="check"
                        onPress={() => friendsApi.accept(r.id).then(invalidate)}
                        style={styles.smallBtn}
                      />
                      <Button
                        title="Отклонить"
                        icon="close"
                        variant="ghost"
                        onPress={() => friendsApi.reject(r.id).then(invalidate)}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {outgoing.length ? (
              <View style={styles.section}>
                <View style={styles.sectionTitle}>
                  <Icon name="clock" pack="fi" size={14} color={colors.inkMuted} />
                  <Typography variant="bodyMedium" color={colors.inkMuted}>
                    Исходящие
                  </Typography>
                </View>
                {outgoing.map((r) => (
                  <View key={r.id} style={cardStyle}>
                    <Typography variant="bodySmall" color={colors.inkMuted}>
                      Исходящая заявка
                    </Typography>
                    <Button
                      title="Отменить"
                      icon="close"
                      variant="ghost"
                      onPress={() => friendsApi.cancel(r.id).then(invalidate)}
                    />
                  </View>
                ))}
              </View>
            ) : null}

            <View style={[styles.sectionTitle, { marginTop: space.sm }]}>
              <Icon name="friends" pack="fi" size={14} color={colors.inkMuted} />
              <Typography variant="bodyMedium" color={colors.inkMuted}>
                Мои друзья
              </Typography>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: colors.surface }, createShadow('soft')]}>
            <Icon name="friends" pack="fi" size={26} color={colors.inkMuted} />
            <Typography color={colors.ink} style={{ textAlign: 'center' }}>
              Пока никого
            </Typography>
            <Typography color={colors.inkMuted} style={{ textAlign: 'center' }}>
              Добавьте друзей в профиле — по нику или ссылке
            </Typography>
            <Button
              title="В профиль"
              icon="profile"
              onPress={() => router.push('/(main)/profile')}
              style={{ marginTop: space.sm, alignSelf: 'stretch' }}
            />
          </View>
        }
        renderItem={({ item }) => {
          const loc = locationById.get(item.user_id);
          const presence = loc ? formatFriendPresence(loc) : null;
          const canMap = friendPresenceClickable(loc);
          return (
            <View style={[styles.friend, createShadow('soft'), { backgroundColor: colors.surface }]}>
              <Pressable
                disabled={!canMap}
                onPress={() => {
                  if (!loc) return;
                  requestFocus(loc.lat, loc.lon, 16, item.user_id);
                  router.push('/(main)/map');
                }}
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, gap: 12 }}
              >
                <FriendPin
                  uri={item.avatar_url}
                  name={item.display_name || item.username}
                  size={40}
                />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Typography variant="bodyMedium" color={colors.ink} numberOfLines={1}>
                    {item.display_name || item.username || 'Друг'}
                  </Typography>
                  <Typography
                    variant="caption"
                    color={canMap ? colors.accent : colors.inkMuted}
                    numberOfLines={1}
                  >
                    {presence ?? `@${item.username}`}
                  </Typography>
                </View>
              </Pressable>
              <Pressable
                onPress={async () => {
                  try {
                    const chat = await chatsApi.direct(item.user_id);
                    router.push(`/(main)/chats/${chat.id}`);
                  } catch (e) {
                    showError(e, 'Не удалось открыть чат');
                  }
                }}
                style={[styles.chatBtn, { backgroundColor: colors.accent }]}
                accessibilityLabel="открыть чат"
              >
                <Icon name="chats" pack="fi" size={14} color={colors.accentText} />
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert('Друг', undefined, [
                    {
                      text: 'Удалить',
                      style: 'destructive',
                      onPress: () => friendsApi.remove(item.user_id).then(invalidate),
                    },
                    {
                      text: 'Блок',
                      style: 'destructive',
                      onPress: () => friendsApi.block(item.user_id).then(invalidate),
                    },
                    { text: 'Отмена', style: 'cancel' },
                  ])
                }
                hitSlop={8}
                accessibilityLabel="действия"
              >
                <Icon name="settings" pack="fi" size={16} color={colors.inkMuted} />
              </Pressable>
            </View>
          );
        }}
      />
    </AppPage>
  );
}

const styles = StyleSheet.create({
  headerBlock: { gap: space.md, marginBottom: space.md },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heading: { letterSpacing: -0.6, fontSize: 26, lineHeight: 32, flex: 1 },
  visBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.xl,
    padding: space.md,
  },
  hintIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: space.sm },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  card: {
    borderRadius: radii.xl,
    padding: space.lg,
    gap: space.md,
  },
  actions: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  smallBtn: { minHeight: 42, paddingHorizontal: space.lg },
  friend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radii.xl,
    marginBottom: space.sm,
  },
  chatBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    borderRadius: radii.xl,
    padding: space.xl,
    gap: space.sm,
    alignItems: 'center',
  },
});
