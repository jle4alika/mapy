import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Switch, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import { profileApi } from '../../../src/shared/api/endpoints';
import { formatApiError } from '../../../src/shared/api/errors';
import { showError } from '../../../src/features/notifications/toast-store';
import { useSessionStore } from '../../../src/features/auth/session-store';
import { useNotificationStore } from '../../../src/features/notifications/notification-store';
import {
  Avatar,
  Button,
  Icon,
  Input,
  Screen,
  ThemeSwitcher,
  Typography,
  createShadow,
  radii,
  space,
} from '../../../src/shared/ui';
import { useTheme } from '../../../src/shared/ui/ThemeProvider';
import { AddFriendsPanel } from '../../../src/widgets/friends/AddFriendsPanel';

export default function ProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const user = useSessionStore((s) => s.user);
  const refreshMe = useSessionStore((s) => s.refreshMe);
  const logout = useSessionStore((s) => s.logout);
  const notifItems = useNotificationStore((s) => s.items);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const [status, setStatus] = useState(user?.status_text ?? '');
  const [error, setError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [addFriendsOpen, setAddFriendsOpen] = useState(false);

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showError(new Error('Нет доступа к галерее'), 'Нужен доступ к фото');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (res.canceled || !res.assets[0]) return;
    setAvatarUploading(true);
    try {
      const asset = res.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      const name = asset.fileName || (mime.includes('png') ? 'avatar.png' : 'avatar.jpg');
      await profileApi.uploadAvatar(asset.uri, name, mime);
      await refreshMe();
      setError(null);
    } catch (e) {
      showError(e, 'Не удалось обновить аватар');
      setError(formatApiError(e));
    } finally {
      setAvatarUploading(false);
    }
  };

  const privacyQuery = useQuery({ queryKey: ['privacy'], queryFn: () => profileApi.getPrivacy() });
  const notifQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => profileApi.getNotifications(),
  });
  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: () => profileApi.favorites(),
  });
  const favoritesCount = (favoritesQuery.data ?? []).length;

  const saveStatus = useMutation({
    mutationFn: () => profileApi.patch({ status_text: status }),
    onSuccess: async () => {
      await refreshMe();
      setError(null);
    },
    onError: (e) => {
      showError(e, 'Не удалось сохранить');
      setError(formatApiError(e));
    },
  });

  return (
    <Screen scroll>
      <View
        style={[
          styles.header,
          createShadow('soft'),
          { backgroundColor: colors.surface },
        ]}
      >
        <Avatar
          uri={user?.avatar_url}
          name={user?.display_name || user?.username}
          size={72}
          editable
          uploading={avatarUploading}
          onEditPress={pickAvatar}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Typography variant="h3" color={colors.ink} style={{ letterSpacing: -0.3 }}>
            {user?.display_name || user?.username}
          </Typography>
          <Typography variant="caption" color={colors.inkMuted}>
            @{user?.username} · {user?.email}
          </Typography>
        </View>
      </View>

      <View style={[styles.section, createShadow('soft'), { backgroundColor: colors.surface }]}>
        <Typography variant="bodyMedium" color={colors.ink} style={styles.sectionLabel}>
          Тема
        </Typography>
        <ThemeSwitcher />
      </View>

      <View style={createShadow('soft')}>
        <AddFriendsPanel
          expanded={addFriendsOpen}
          onToggle={() => setAddFriendsOpen((v) => !v)}
        />
      </View>

      <View style={[styles.section, createShadow('soft'), { backgroundColor: colors.surface }]}>
        <Typography variant="bodyMedium" color={colors.ink} style={styles.sectionLabel}>
          Профиль
        </Typography>
        <Input label="Статус" value={status} onChangeText={setStatus} />
        <Button
          title="Сохранить статус"
          icon="check"
          onPress={() => saveStatus.mutate()}
          loading={saveStatus.isPending}
        />
      </View>

      <View style={[styles.section, createShadow('soft'), { backgroundColor: colors.surface }]}>
        <View style={styles.sectionTitle}>
          <Icon name="shield" pack="fi" size={16} color={colors.accent} />
          <Typography variant="bodyMedium" color={colors.ink}>
            Приватность
          </Typography>
        </View>
        {privacyQuery.data
          ? (
              [
                ['share_precise_location', 'Точная геолокация'],
                ['share_battery', 'Батарея'],
                ['share_speed', 'Скорость'],
                ['discoverable_in_search', 'Поиск по нику'],
              ] as const
            ).map(([key, label]) => (
              <View key={key} style={[styles.switchRow, { borderBottomColor: colors.border }]}>
                <Typography style={{ flex: 1 }} color={colors.ink}>
                  {label}
                </Typography>
                <Switch
                  value={privacyQuery.data[key]}
                  trackColor={{ false: colors.surfaceMuted, true: colors.accentSoft }}
                  thumbColor={colors.surface}
                  onValueChange={async (v) => {
                    await profileApi.putPrivacy({ [key]: v });
                    qc.invalidateQueries({ queryKey: ['privacy'] });
                  }}
                />
              </View>
            ))
          : null}
      </View>

      <View style={[styles.section, createShadow('soft'), { backgroundColor: colors.surface }]}>
        <View style={styles.sectionTitle}>
          <Icon name="bell" pack="fi" size={16} color={colors.accent} />
          <Typography variant="bodyMedium" color={colors.ink}>
            Уведомления
          </Typography>
        </View>
        {notifItems.length === 0 ? (
          <Typography color={colors.inkMuted}>Пока тихо — заявки и сообщения появятся здесь</Typography>
        ) : (
          notifItems.slice(0, 12).map((n) => (
            <View key={n.id} style={[styles.switchRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Typography color={colors.ink}>{n.title}</Typography>
                <Typography variant="caption" color={colors.inkMuted}>
                  {n.body}
                </Typography>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={[styles.section, createShadow('soft'), { backgroundColor: colors.surface }]}>
        <View style={styles.sectionTitle}>
          <Icon name="settings" pack="fi" size={16} color={colors.accent} />
          <Typography variant="bodyMedium" color={colors.ink}>
            Пуши
          </Typography>
        </View>
        {notifQuery.data
          ? (
              [
                ['dm_enabled', 'Личные сообщения'],
                ['friend_requests', 'Заявки в друзья'],
                ['place_chat_activity', 'Чаты мест'],
                ['friend_arrived', 'Друг рядом'],
                ['system', 'Системные'],
              ] as const
            ).map(([key, label]) => (
              <View key={key} style={[styles.switchRow, { borderBottomColor: colors.border }]}>
                <Typography style={{ flex: 1 }} color={colors.ink}>
                  {label}
                </Typography>
                <Switch
                  value={notifQuery.data[key]}
                  trackColor={{ false: colors.surfaceMuted, true: colors.accentSoft }}
                  thumbColor={colors.surface}
                  onValueChange={async (v) => {
                    await profileApi.putNotifications({ [key]: v });
                    qc.invalidateQueries({ queryKey: ['notifications'] });
                  }}
                />
              </View>
            ))
          : null}
      </View>

      <Pressable
        onPress={() => router.push('/(main)/profile/favorites')}
        style={({ pressed }) => [
          styles.section,
          styles.favLink,
          createShadow('soft'),
          { backgroundColor: colors.surface, opacity: pressed ? 0.92 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="избранные места"
      >
        <View style={[styles.favIcon, { backgroundColor: '#FFF8E0' }]}>
          <Icon name="star" pack="fi" size={18} color="#F5C400" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Typography variant="bodyMedium" color={colors.ink}>
            Избранные места
          </Typography>
          <Typography variant="caption" color={colors.inkMuted}>
            {favoritesCount === 0
              ? 'Пока пусто — добавьте звёздочкой на карте'
              : `${favoritesCount} ${favoritesCount === 1 ? 'место' : favoritesCount < 5 ? 'места' : 'мест'}`}
          </Typography>
        </View>
        <Icon name="forward" pack="fi" size={18} color={colors.inkMuted} />
      </Pressable>

      {error ? (
        <Typography color={colors.danger} style={{ marginTop: space.md }}>
          {error}
        </Typography>
      ) : null}

      <Button
        title="Выйти"
        icon="logout"
        variant="secondary"
        style={{ marginTop: space.xl }}
        onPress={async () => {
          await logout();
          router.replace('/(auth)/login');
        }}
      />
      <Button
        title="Удалить аккаунт"
        icon="alert"
        variant="danger"
        onPress={() =>
          Alert.alert('Удаление', 'Аккаунт будет запланирован к удалению', [
            {
              text: 'Подтвердить',
              style: 'destructive',
              onPress: async () => {
                await profileApi.deleteAccount();
                await logout();
                router.replace('/');
              },
            },
            { text: 'Отмена', style: 'cancel' },
          ])
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    borderRadius: radii.xl,
    padding: space.lg,
    marginBottom: space.md,
  },
  section: {
    borderRadius: radii.xl,
    padding: space.lg,
    gap: space.md,
    marginBottom: space.md,
  },
  sectionLabel: { marginBottom: 2 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  favLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  favIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
