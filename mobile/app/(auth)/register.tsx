import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';

import { authApi } from '../../src/shared/api/endpoints';
import { formatApiError } from '../../src/shared/api/errors';
import { showError, showToast } from '../../src/features/notifications/toast-store';
import { useSessionStore } from '../../src/features/auth/session-store';
import { applyPendingFriendInvite } from '../../src/features/friends/applyPendingInvite';
import { savePendingInvite } from '../../src/features/friends/invite-store';
import {
  Button,
  Input,
  LogoMark,
  Screen,
  Typography,
  createShadow,
  fonts,
  radii,
  space,
} from '../../src/shared/ui';
import { useTheme } from '../../src/shared/ui/ThemeProvider';
import { useContentPadding } from '../../src/shared/hooks/useBreakpoint';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const setSession = useSessionStore((s) => s.setSession);
  const pad = useContentPadding();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (invite) void savePendingInvite(String(invite));
  }, [invite]);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await authApi.register({
        email: email.trim(),
        username: username.trim(),
        password,
      });
      const res = await authApi.login(email.trim(), password);
      await setSession(res.access_token);
      const friended = await applyPendingFriendInvite();
      if (friended) {
        showToast('Друзья', 'Вы добавлены в друзья по приглашению', 'success');
      }
      router.replace('/(main)/map');
    } catch (e) {
      showError(e, 'Регистрация не выполнена');
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll style={[styles.page, { paddingHorizontal: pad }]}>
      <View style={styles.brand}>
        <LogoMark size={28} />
        <Typography style={[styles.brandTitle, { color: colors.ink }]}>Mapy</Typography>
        <Typography variant="body" color={colors.inkMuted} style={styles.brandLead}>
          Создайте аккаунт за минуту
        </Typography>
      </View>

      <View
        style={[
          styles.panel,
          createShadow('card'),
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Typography variant="h2" color={colors.ink}>
          Регистрация
        </Typography>
        <Typography variant="bodySmall" color={colors.inkMuted} style={styles.sub}>
          {invite
            ? `После регистрации вы станете друзьями с @${String(invite).replace(/^@/, '')}`
            : 'Email, ник и пароль — и сразу на карту'}
        </Typography>

        <View style={styles.form}>
          <Input
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label="Ник"
            autoCapitalize="none"
            autoComplete="username"
            value={username}
            onChangeText={setUsername}
          />
          <Input
            label="Пароль"
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
          />
          {error ? (
            <Typography variant="bodySmall" color={colors.danger}>
              {error}
            </Typography>
          ) : null}
          <Button title="Создать аккаунт" icon="userPlus" onPress={onSubmit} loading={loading} />
        </View>

        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.linkRow}>
            <Typography variant="bodySmall" color={colors.accent}>
              Уже есть аккаунт? Войти
            </Typography>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
    paddingTop: space.xl,
  },
  brand: { alignItems: 'center', marginBottom: space.xl, gap: 8 },
  brandTitle: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1.4,
  },
  brandLead: { textAlign: 'center', maxWidth: 280 },
  panel: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.xl,
    gap: 6,
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' } as object,
      default: {},
    }),
  },
  sub: { marginBottom: space.md },
  form: { gap: space.md, marginTop: 4 },
  linkRow: { marginTop: space.lg, alignItems: 'center', paddingVertical: 4 },
});
