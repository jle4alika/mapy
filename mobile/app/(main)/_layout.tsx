import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '../../src/features/auth/session-store';
import { useMapUiStore } from '../../src/features/map/map-ui-store';
import { useNotificationStore } from '../../src/features/notifications/notification-store';
import { friendsApi } from '../../src/shared/api/endpoints';
import { useSideNav } from '../../src/shared/hooks/useBreakpoint';
import { Icon, layout, radii } from '../../src/shared/ui';
import { useTheme } from '../../src/shared/ui/ThemeProvider';
import { AdaptiveTabBar } from '../../src/widgets/shell/AdaptiveTabBar';
import { DesktopPanelChrome } from '../../src/widgets/shell/DesktopPanelChrome';
import { DesktopMapHost } from '../../src/widgets/map/DesktopMapHost';

function MainTabs({ hideTabBar }: { hideTabBar?: boolean }) {
  return (
    <Tabs
      tabBar={hideTabBar ? () => null : (props) => <AdaptiveTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="map" options={{ title: 'Карта' }} />
      <Tabs.Screen name="chats" options={{ title: 'Чаты' }} />
      <Tabs.Screen name="friends" options={{ title: 'Друзья' }} />
      <Tabs.Screen name="profile" options={{ title: 'Профиль' }} />
    </Tabs>
  );
}

/** PC: слева панель (можно свернуть), справа карта */
function DesktopShell() {
  const { colors } = useTheme();
  const collapsed = useMapUiStore((s) => s.panelCollapsed);
  const togglePanelCollapsed = useMapUiStore((s) => s.togglePanelCollapsed);

  return (
    <View style={[styles.desktopRoot, { backgroundColor: colors.mapCanvas }]}>
      <View
        style={[
          styles.panel,
          {
            width: collapsed ? 0 : layout.appPanelWidth,
            backgroundColor: colors.surface,
            borderRightColor: colors.border,
            opacity: collapsed ? 0 : 1,
          },
        ]}
        pointerEvents={collapsed ? 'none' : 'auto'}
      >
        <DesktopPanelChrome />
        <View style={[styles.panelBody, { backgroundColor: colors.surface }]}>
          <MainTabs hideTabBar />
        </View>
      </View>

      <View style={styles.mapPane}>
        <DesktopMapHost />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={collapsed ? 'показать меню' : 'скрыть меню'}
          onPress={togglePanelCollapsed}
          style={({ pressed }) => [
            styles.collapseBtn,
            {
              backgroundColor: colors.ink,
              left: collapsed ? 12 : -16,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Icon name={collapsed ? 'forward' : 'back'} pack="fi" size={14} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

export default function MainLayout() {
  const token = useSessionStore((s) => s.token);
  const side = useSideNav();
  const { colors } = useTheme();
  useQuery({
    queryKey: ['friends', 'requests'],
    queryFn: () => friendsApi.requests(),
    enabled: !!token,
    refetchInterval: 45_000,
  });
  useNotificationStore((s) => s.unread);

  if (!token) return <Redirect href="/(auth)/login" />;

  if (side) return <DesktopShell />;

  return (
    <View style={[styles.mobileRoot, { backgroundColor: colors.canvas }]}>
      <MainTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  mobileRoot: { flex: 1 },
  desktopRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  panel: {
    flexShrink: 0,
    alignSelf: 'stretch',
    borderRightWidth: StyleSheet.hairlineWidth,
    zIndex: 2,
    overflow: 'hidden',
  },
  panelBody: {
    flex: 1,
    minHeight: 0,
  },
  mapPane: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  collapseBtn: {
    position: 'absolute',
    top: 18,
    zIndex: 20,
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
