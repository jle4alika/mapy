import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';

import { authApi } from '../../src/shared/api/endpoints';
import { formatApiError } from '../../src/shared/api/errors';
import { showError, showToast } from '../../src/features/notifications/toast-store';
import { useSessionStore } from '../../src/features/auth/session-store';
import { applyPendingFriendInvite } from '../../src/features/friends/applyPendingInvite';
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

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const pad = useContentPadding();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login(login.trim(), password);
      await setSession(res.access_token);
      const friended = await applyPendingFriendInvite();
      if (friended) {
        showToast('Друзья', 'Вы добавлены в друзья по приглашению', 'success');
      }
      router.replace('/(main)/map');
    } catch (e) {
      showError(e, 'Вход не выполнен');
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
          Друзья на карте и чаты у мест
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
          Вход
        </Typography>
        <Typography variant="bodySmall" color={colors.inkMuted} style={styles.sub}>
          Email или ник и пароль от аккаунта
        </Typography>

        <View style={styles.form}>
          <Input
            label="Email или ник"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            autoComplete="username"
            textContentType="username"
            value={login}
            onChangeText={setLogin}
            placeholder="name@mail.com или username"
          />
          <Input
            label="Пароль"
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
          />
          {error ? (
            <Typography variant="bodySmall" color={colors.danger}>
              {error}
            </Typography>
          ) : null}
          <Button title="Войти" icon="lock" onPress={onSubmit} loading={loading} />
        </View>

        <Link href="/(auth)/register" asChild>
          <Pressable style={styles.linkRow}>
            <Typography variant="bodySmall" color={colors.accent}>
              Нет аккаунта? Зарегистрироваться
            </Typography>
          </Pressable>
        </Link>
      </View>

      <Link href="/" asChild>
        <Pressable style={styles.back}>
          <Typography variant="caption" color={colors.inkMuted}>
            На главную
          </Typography>
        </Pressable>
      </Link>
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
  back: { marginTop: space.xl, alignItems: 'center', paddingVertical: 8 },
});
