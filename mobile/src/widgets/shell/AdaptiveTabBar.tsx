import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSideNav } from '../../shared/hooks/useBreakpoint';
import { Icon, type IconName } from '../../shared/ui/Icon';
import { useTheme } from '../../shared/ui/ThemeProvider';
import { createShadow, fonts } from '../../shared/ui';

const LABELS: Record<string, string> = {
  map: 'Карта',
  chats: 'Чаты',
  friends: 'Друзья',
  profile: 'Профиль',
};

const ICONS: Record<string, IconName> = {
  map: 'map',
  chats: 'chats',
  friends: 'friends',
  profile: 'profile',
};

type TabRoute = {
  key: string;
  name: string;
  state?: { index?: number };
};

type Props = {
  state: {
    index: number;
    routes: TabRoute[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  descriptors?: unknown;
  insets?: unknown;
};

/** Скрыть нижний tab bar, когда открыт тред чата */
export function isChatThreadFocused(state: Props['state']): boolean {
  const route = state.routes[state.index];
  if (route.name !== 'chats') return false;
  return typeof route.state?.index === 'number' && route.state.index > 0;
}

/** Только мобилка. На PC навигация в DesktopPanelChrome. */
export function AdaptiveTabBar({ state, navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const side = useSideNav();

  if (side) return null;
  if (isChatThreadFocused(state)) return null;

  const items = state.routes.map((route, index) => {
    const focused = state.index === index;
    const color = focused ? colors.accent : colors.tabInactive;
    const label = LABELS[route.name] ?? route.name;
    const icon = ICONS[route.name] ?? 'map';
    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [styles.tabItem, pressed && { opacity: 0.85 }]}
      >
        <Icon name={icon} pack="fi" size={22} color={color} />
        <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );
  });

  return (
    <View
      style={[
        styles.tabBar,
        createShadow('soft'),
        {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          height: 56 + (insets.bottom > 0 ? insets.bottom : 8),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
      ]}
    >
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    minWidth: 64,
  },
  tabLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.05,
  },
});
