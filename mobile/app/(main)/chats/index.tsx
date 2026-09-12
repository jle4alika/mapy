import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { chatsApi } from '../../../src/shared/api/endpoints';
import { Icon, Typography, createShadow, radii, space } from '../../../src/shared/ui';
import { useTheme } from '../../../src/shared/ui/ThemeProvider';
import { AppPage, useListContentStyle } from '../../../src/widgets/shell/AppPage';

export default function ChatsListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const listStyle = useListContentStyle({
    paddingBottom: space.xxxl,
    paddingTop: space.lg,
  });
  const { data = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['chats'],
    queryFn: () => chatsApi.list(),
  });

  return (
    <AppPage fullBleed>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={listStyle}
        ListHeaderComponent={
          <View style={styles.headingRow}>
            <Typography variant="h2" color={colors.ink} style={styles.heading}>
              Чаты
            </Typography>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceMuted }]}>
              <Icon name="chats" pack="fi" size={28} color={colors.inkMuted} />
            </View>
            <Typography color={colors.inkMuted} style={{ textAlign: 'center', maxWidth: 280 }}>
              {isLoading ? 'Загрузка…' : 'Пока пусто — откройте чат с карты или из друзей'}
            </Typography>
          </View>
        }
        renderItem={({ item }) => {
          const isPlace = item.kind === 'place';
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/(main)/chats/${item.id}`)}
              style={({ pressed }) => [
                styles.row,
                createShadow('soft'),
                {
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.kindMark,
                  {
                    backgroundColor: isPlace ? colors.pinPlace : colors.accentSoft,
                  },
                ]}
              >
                <Icon
                  name={isPlace ? 'pin' : 'friends'}
                  pack="fi"
                  size={16}
                  color={isPlace ? '#fff' : colors.accent}
                />
              </View>
              <View style={styles.body}>
                <Typography variant="bodyMedium" color={colors.ink} numberOfLines={1}>
                  {item.title ?? (isPlace ? 'Чат места' : 'Личный чат')}
                </Typography>
                <View style={styles.metaRow}>
                  <Icon
                    name={isPlace ? 'pin' : 'profile'}
                    pack="fi"
                    size={11}
                    color={colors.inkMuted}
                  />
                  <Typography variant="caption" color={colors.inkMuted} numberOfLines={1}>
                    {isPlace ? 'Место' : 'Личка'}
                    {item.last_message_at
                      ? ` · ${new Date(item.last_message_at).toLocaleString()}`
                      : ''}
                  </Typography>
                </View>
              </View>
              <Icon name="forward" pack="fi" size={16} color={colors.inkMuted} />
            </Pressable>
          );
        }}
      />
    </AppPage>
  );
}

const styles = StyleSheet.create({
  headingRow: {
    marginBottom: space.md,
  },
  heading: {
    letterSpacing: -0.6,
    fontSize: 26,
    lineHeight: 32,
  },
  empty: {
    flexGrow: 1,
    paddingVertical: space.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    minHeight: 280,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radii.xl,
    marginBottom: space.sm,
  },
  kindMark: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 3, minWidth: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
