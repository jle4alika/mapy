import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMapUiStore } from '../../features/map/map-ui-store';
import { Icon, type IconName } from '../../shared/ui/Icon';
import { LogoMark } from '../../shared/ui/LogoMark';
import { Typography } from '../../shared/ui/Typography';
import { useTheme } from '../../shared/ui/ThemeProvider';
import { fonts, radii, space } from '../../shared/ui';

const SECTIONS: { href: string; name: string; label: string; icon: IconName }[] = [
  { href: '/(main)/map', name: 'map', label: 'Карта', icon: 'map' },
  { href: '/(main)/chats', name: 'chats', label: 'Чаты', icon: 'chats' },
  { href: '/(main)/friends', name: 'friends', label: 'Друзья', icon: 'friends' },
  { href: '/(main)/profile', name: 'profile', label: 'Профиль', icon: 'profile' },
];

function activeSection(pathname: string): string {
  if (pathname.includes('/chats')) return 'chats';
  if (pathname.includes('/friends')) return 'friends';
  if (pathname.includes('/profile')) return 'profile';
  return 'map';
}

/** Шапка левой панели: бренд, поиск, разделы */
export function DesktopPanelChrome() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const active = activeSection(pathname);
  const searchQuery = useMapUiStore((s) => s.searchQuery);
  const setSearchQuery = useMapUiStore((s) => s.setSearchQuery);
  const setSelectedPlace = useMapUiStore((s) => s.setSelectedPlace);
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <View
      style={[
        styles.chrome,
        {
          backgroundColor: colors.surface,
          paddingTop: Math.max(insets.top, 16),
        },
      ]}
    >
      <View style={styles.brandRow}>
        <LogoMark size={30} withWordmark />
      </View>

      <View
        style={[
          styles.search,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: searchFocused ? colors.accent : 'transparent',
            borderWidth: 1.5,
          },
        ]}
      >
        <Icon name="pin" pack="fi" size={15} color={colors.accent} />
        <TextInput
          value={searchQuery}
          onChangeText={(t) => {
            setSearchQuery(t);
            if (active !== 'map') router.push('/(main)/map');
          }}
          onFocus={() => {
            setSearchFocused(true);
            if (active !== 'map') router.push('/(main)/map');
          }}
          onBlur={() => setSearchFocused(false)}
          placeholder="Поиск и выбор мест"
          placeholderTextColor={colors.inkMuted}
          style={[styles.searchInput, { color: colors.ink, fontFamily: fonts.body }]}
          returnKeyType="search"
          accessibilityLabel="Поиск на карте"
        />
        <Icon name="search" pack="fi" size={16} color={colors.inkMuted} />
        {searchQuery ? (
          <Pressable
            onPress={() => setSearchQuery('')}
            hitSlop={8}
            accessibilityLabel="очистить поиск"
            style={[styles.clearBtn, { backgroundColor: colors.border }]}
          >
            <Icon name="close" pack="fi" size={11} color={colors.inkMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.nav}>
        {SECTIONS.map((s) => {
          const focused = active === s.name;
          return (
            <Pressable
              key={s.name}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              onPress={() => {
                setSelectedPlace(null);
                router.push(s.href as never);
              }}
              style={({ pressed }) => [
                styles.navItem,
                focused && { backgroundColor: colors.accentSoft },
                pressed && { opacity: 0.88 },
              ]}
            >
              <Icon
                name={s.icon}
                pack="fi"
                size={17}
                color={focused ? colors.accent : colors.inkMuted}
              />
              <Typography
                style={[
                  styles.navLabel,
                  { fontFamily: focused ? fonts.bodyBold : fonts.bodyMedium },
                ]}
                color={focused ? colors.accent : colors.inkMuted}
                numberOfLines={1}
              >
                {s.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chrome: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    gap: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 34,
  },
  search: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nav: {
    flexDirection: 'row',
    gap: 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: radii.lg,
  },
  navLabel: {
    fontSize: 11,
  },
});
