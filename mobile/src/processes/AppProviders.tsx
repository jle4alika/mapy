import React, { useEffect, useState } from 'react';
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { AppState, Platform, View } from 'react-native';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import {
  Unbounded_500Medium,
  Unbounded_600SemiBold,
  Unbounded_700Bold,
} from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useSessionStore } from '../features/auth/session-store';
import { useOutboxStore } from '../features/chat/outbox-store';
import { showError } from '../features/notifications/toast-store';
import { GatewayProvider } from '../features/realtime/GatewayProvider';
import { useThemeStore } from '../features/theme/theme-store';
import { ThemeProvider } from '../shared/ui/ThemeProvider';
import { ToastHost } from '../widgets/system/ToastHost';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data !== undefined) return;
      showError(error, 'Не удалось загрузить данные');
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      showError(error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
    },
  },
});

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  }),
);

function onAppStateChange(status: string) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrate = useSessionStore((s) => s.hydrate);
  const hydrated = useSessionStore((s) => s.hydrated);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const themeHydrated = useThemeStore((s) => s.hydrated);
  const hydrateOutbox = useOutboxStore((s) => s.hydrate);
  const flush = useOutboxStore((s) => s.flush);
  const [bootDeadline, setBootDeadline] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Unbounded_500Medium,
    Unbounded_600SemiBold,
    Unbounded_700Bold,
  });

  useEffect(() => {
    hydrate();
    hydrateTheme();
    hydrateOutbox();
    const sub = AppState.addEventListener('change', onAppStateChange);
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) flush();
    });
    return () => {
      sub.remove();
      unsub();
    };
  }, [hydrate, hydrateTheme, hydrateOutbox, flush]);

  // Не держим белый экран вечно, если шрифты/сеть тормозят
  useEffect(() => {
    const t = setTimeout(() => setBootDeadline(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const fontsReady = fontsLoaded || !!fontError;
  const storesReady = hydrated && themeHydrated;
  const ready = (fontsReady && storesReady) || bootDeadline;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#F1F2F4' }} />;
  }

  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
        ...(Platform.OS === 'web' ? { minHeight: '100vh' as unknown as number } : null),
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <GatewayProvider>{children}</GatewayProvider>
          <ToastHost />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
