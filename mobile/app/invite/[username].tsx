import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { applyPendingFriendInvite } from '../../src/features/friends/applyPendingInvite';
import { savePendingInvite } from '../../src/features/friends/invite-store';
import { useSessionStore } from '../../src/features/auth/session-store';
import { showToast } from '../../src/features/notifications/toast-store';
import { Typography, space } from '../../src/shared/ui';
import { useTheme } from '../../src/shared/ui/ThemeProvider';

/**
 * Deep link / веб: mapy://invite/:username или /invite/:username
 * — если уже вошли: сразу дружба
 * — иначе: сохраняем инвайт и ведём на регистрацию
 */
export default function InviteScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { username: raw } = useLocalSearchParams<{ username: string }>();
  const token = useSessionStore((s) => s.token);
  const hydrated = useSessionStore((s) => s.hydrated);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!hydrated || done) return;
    const username = String(raw || '')
      .trim()
      .replace(/^@/, '');
    if (!username) {
      router.replace('/');
      return;
    }

    let cancelled = false;
    (async () => {
      await savePendingInvite(username);
      if (cancelled) return;
      if (token) {
        const ok = await applyPendingFriendInvite();
        if (cancelled) return;
        setDone(true);
        if (ok) {
          showToast('Друзья', `Вы теперь друзья с @${username}`, 'success');
        }
        router.replace('/(main)/friends');
        return;
      }
      setDone(true);
      showToast('Приглашение', `После регистрации вы станете друзьями с @${username}`, 'info');
      router.replace({
        pathname: '/(auth)/register',
        params: { invite: username },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, token, raw, done, router]);

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <ActivityIndicator color={colors.accent} />
      <Typography color={colors.inkMuted} style={{ marginTop: space.md }}>
        Открываем приглашение…
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
});
