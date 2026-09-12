import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';

import type { Friend } from '../../entities/types';
import { friendsApi } from '../../shared/api/endpoints';
import { formatApiError } from '../../shared/api/errors';
import { showError, showToast } from '../../features/notifications/toast-store';
import {
  Button,
  FriendPin,
  Icon,
  Input,
  Typography,
  radii,
  space,
} from '../../shared/ui';
import { useTheme } from '../../shared/ui/ThemeProvider';

type Props = {
  expanded: boolean;
  onToggle: () => void;
};

/** Блок «Добавить друзей»: поиск по нику + поделиться ссылкой */
export function AddFriendsPanel({ expanded, onToggle }: Props) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().replace(/^@/, '')), 280);
    return () => clearTimeout(t);
  }, [query]);

  const inviteQuery = useQuery({
    queryKey: ['friends', 'invite'],
    queryFn: () => friendsApi.invite(),
    enabled: expanded,
  });

  const searchQuery = useQuery({
    queryKey: ['friends', 'search', debounced],
    queryFn: () => friendsApi.search(debounced),
    enabled: expanded && debounced.length >= 1,
  });

  const sendMutation = useMutation({
    mutationFn: (payload: { to_username?: string; to_user_id?: string }) =>
      friendsApi.send(payload),
    onSuccess: () => {
      setQuery('');
      setError(null);
      qc.invalidateQueries({ queryKey: ['friends'] });
      showToast('Друзья', 'Заявка отправлена', 'success');
    },
    onError: (e) => {
      showError(e, 'Заявка не отправлена');
      setError(formatApiError(e));
    },
  });

  const shareInvite = async () => {
    try {
      const info =
        inviteQuery.data ??
        (await friendsApi.invite());
      const webFallback = Linking.createURL(`invite/${info.username}`);
      const shareMessage = [
        'Добавляйся ко мне в Mapy!',
        `@${info.username}`,
        webFallback,
        `Приложение: ${info.deep_link}`,
      ].join('\n');

      await Share.share(
        Platform.OS === 'ios'
          ? { message: shareMessage, url: webFallback }
          : { message: shareMessage, title: 'Приглашение в Mapy' },
      );
    } catch (e) {
      showError(e, 'Не удалось поделиться');
    }
  };

  const results = (searchQuery.data ?? []) as Friend[];

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface }]}>
      <Pressable
        onPress={onToggle}
        style={styles.head}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={[styles.mark, { backgroundColor: colors.accentSoft }]}>
          <Icon name="userPlus" pack="fi" size={16} color={colors.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Typography variant="bodyMedium" color={colors.ink}>
            Добавить друзей
          </Typography>
          <Typography variant="caption" color={colors.inkMuted}>
            Поиск по нику или ссылка-приглашение
          </Typography>
        </View>
        <Icon
          name={expanded ? 'minus' : 'plus'}
          pack="fi"
          size={18}
          color={colors.inkMuted}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          <Input
            label="Поиск по username"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="@username"
          />
          {error ? (
            <Typography variant="caption" color={colors.danger}>
              {error}
            </Typography>
          ) : null}

          {debounced.length >= 1 ? (
            <View style={styles.results}>
              {searchQuery.isFetching ? (
                <ActivityIndicator color={colors.accent} />
              ) : results.length === 0 ? (
                <Typography variant="caption" color={colors.inkMuted}>
                  Никого не найдено — можно отправить заявку точному нику
                </Typography>
              ) : (
                results.map((u) => (
                  <View key={u.user_id} style={[styles.row, { borderBottomColor: colors.border }]}>
                    <FriendPin
                      uri={u.avatar_url}
                      name={u.display_name || u.username}
                      size={36}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="bodyMedium" color={colors.ink} numberOfLines={1}>
                        {u.display_name || u.username}
                      </Typography>
                      <Typography variant="caption" color={colors.inkMuted}>
                        @{u.username}
                      </Typography>
                    </View>
                    <Pressable
                      onPress={() =>
                        sendMutation.mutate({
                          to_user_id: u.user_id,
                          to_username: u.username ?? undefined,
                        })
                      }
                      style={[styles.addBtn, { backgroundColor: colors.accent }]}
                      accessibilityLabel="добавить"
                    >
                      <Icon name="userPlus" pack="fi" size={14} color={colors.accentText} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          ) : null}

          <Button
            title="Отправить заявку"
            icon="send"
            disabled={query.trim().length < 1}
            loading={sendMutation.isPending}
            onPress={() =>
              sendMutation.mutate({ to_username: query.trim().replace(/^@/, '') })
            }
          />
          <Button
            title="Поделиться ссылкой"
            icon="share"
            variant="secondary"
            loading={inviteQuery.isFetching}
            onPress={shareInvite}
          />
          <Typography variant="caption" color={colors.inkMuted} style={styles.hint}>
            По ссылке человек станет вашим другом сразу после регистрации
          </Typography>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginBottom: space.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    gap: space.md,
  },
  results: { gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { lineHeight: 18 },
});
