import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { useTheme } from './ThemeProvider';
import { THEME_ORDER, THEMES, type ThemeId, radii, space, typography } from './theme';
import { Typography } from './Typography';

const THEME_META: Record<
  ThemeId,
  { icon: IconName; color: string; activeBg: string }
> = {
  day: { icon: 'sun', color: '#E8A017', activeBg: 'rgba(232,160,23,0.12)' },
  midnight: { icon: 'moon', color: '#7B8CFF', activeBg: 'rgba(123,140,255,0.16)' },
  aurora: { icon: 'layers', color: '#0066FF', activeBg: 'rgba(0,102,255,0.10)' },
};

type Props = {
  compact?: boolean;
};

export function ThemeSwitcher({ compact }: Props) {
  const { id, colors, setTheme } = useTheme();

  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      <View style={[styles.row, { backgroundColor: colors.surfaceMuted }]}>
        {THEME_ORDER.map((themeId) => {
          const active = themeId === id;
          const meta = THEME_META[themeId];
          const label = THEMES[themeId].label;
          return (
            <Pressable
              key={themeId}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              onPress={() => setTheme(themeId)}
              style={[
                styles.item,
                active && {
                  backgroundColor: colors.surface,
                  borderColor: meta.color,
                  borderWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: active ? meta.activeBg : 'transparent' },
                ]}
              >
                <Icon
                  name={meta.icon}
                  pack="fi"
                  size={18}
                  color={active ? meta.color : colors.inkMuted}
                />
              </View>
              <Typography
                variant="caption"
                color={active ? colors.ink : colors.inkMuted}
                style={styles.label}
                numberOfLines={1}
              >
                {label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
      {!compact ? (
        <Typography variant="caption" color={colors.inkMuted} style={{ marginTop: space.sm }}>
          {colors.description}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  row: {
    flexDirection: 'row',
    borderRadius: radii.md,
    padding: 3,
    gap: 2,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.caption, fontSize: 12 },
});
