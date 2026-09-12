import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { friendsApi } from '../../../src/shared/api/endpoints';
import { formatApiError } from '../../../src/shared/api/errors';
import { showError } from '../../../src/features/notifications/toast-store';
import { Icon, Typography, createShadow, fonts, radii, space, webScrollProps } from '../../../src/shared/ui';
import { useTheme } from '../../../src/shared/ui/ThemeProvider';
import { AppPage, useListContentStyle } from '../../../src/widgets/shell/AppPage';

type Mode = 'normal' | 'frozen' | 'approximate';

const MODE_META: Record<Mode, { label: string; icon: 'eye' | 'pin' | 'lock' }> = {
  normal: { label: 'Обычно', icon: 'eye' },
  approximate: { label: 'Примерно', icon: 'pin' },
  frozen: { label: 'Заморозка', icon: 'lock' },
};

export default function VisibilityScreen() {
  const { colors } = useTheme();
  const listStyle = useListContentStyle({ paddingBottom: space.xxxl, gap: space.md });
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const friendsQuery = useQuery({ queryKey: ['friends'], queryFn: () => friendsApi.list() });
  const visibilityQuery = useQuery({
    queryKey: ['privacy', 'visibility'],
    queryFn: () => friendsApi.visibility(),
  });

  const mutation = useMutation({
    mutationFn: ({ friendId, mode }: { friendId: string; mode: Mode }) => {
      const expires = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      if (mode === 'normal') {
        return friendsApi.setVisibility(friendId, { mode: 'normal' });
      }
      if (mode === 'approximate') {
        return friendsApi.setVisibility(friendId, {
          mode: 'approximate',
          approximate_radius_m: 500,
          expires_at: expires,
        });
      }
      return friendsApi.setVisibility(friendId, {
        mode: 'frozen',
        expires_at: expires,
      });
    },
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ['privacy', 'visibility'] });
    },
    onError: (e) => {
      showError(e, 'Не удалось изменить видимость');
      setError(formatApiError(e));
    },
  });

  const modeFor = (friendId: string): Mode => {
    const row = (visibilityQuery.data ?? []).find((v) => v.viewer_id === friendId);
    return (row?.mode as Mode) ?? 'normal';
  };

  return (
    <AppPage fullBleed>
      <FlatList
        {...webScrollProps}
        data={friendsQuery.data ?? []}
        keyExtractor={(i) => i.user_id}
        contentContainerStyle={listStyle}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Typography variant="h2" color={colors.ink} style={styles.heading}>
              Видимость
            </Typography>
            <Typography variant="bodySmall" color={colors.inkMuted}>
              Для каждого друга: обычно, примерно или заморозка на 2 часа.
            </Typography>
            {error ? (
              <Typography color={colors.danger}>{error}</Typography>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="friends" pack="fi" size={22} color={colors.inkMuted} />
            <Typography color={colors.inkMuted}>Сначала добавьте друзей</Typography>
          </View>
        }
        renderItem={({ item }) => {
          const mode = modeFor(item.user_id);
          return (
            <View
              style={[
                styles.card,
                createShadow('soft'),
                { backgroundColor: colors.surface },
              ]}
            >
              <Typography variant="bodyMedium" color={colors.ink}>
                {item.display_name || item.username}
              </Typography>
              <View style={[styles.segment, { backgroundColor: colors.surfaceMuted }]}>
                {(['normal', 'approximate', 'frozen'] as Mode[]).map((m) => {
                  const active = mode === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => mutation.mutate({ friendId: item.user_id, mode: m })}
                      style={[
                        styles.segBtn,
                        active && { backgroundColor: colors.surface },
                        active && createShadow('soft'),
                      ]}
                    >
                      <Icon
                        name={MODE_META[m].icon}
                        pack="fi"
                        size={13}
                        color={active ? colors.accent : colors.inkMuted}
                      />
                      <Typography
                        variant="caption"
                        color={active ? colors.ink : colors.inkMuted}
                        style={active ? styles.segActive : undefined}
                      >
                        {MODE_META[m].label}
                      </Typography>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        }}
      />
    </AppPage>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 6, marginBottom: space.sm, paddingTop: space.sm },
  heading: { letterSpacing: -0.5, fontSize: 24, lineHeight: 30 },
  card: {
    borderRadius: radii.lg,
    padding: space.md,
    gap: space.sm,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: radii.md,
    padding: 3,
    gap: 2,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  segActive: { fontFamily: fonts.bodyBold },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: space.lg },
});
