import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from './ThemeProvider';
import { THEME_ORDER, type ThemeId, radii, space, typography } from './theme';
import { Typography } from './Typography';

const SWATCH: Record<ThemeId, [string, string]> = {
  day: ['#F1F2F4', '#0066FF'],
  midnight: ['#121212', '#4C8DFF'],
  aurora: ['#0D0F12', '#5B9CFF'],
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
          const [a, b] = SWATCH[themeId];
          const label =
            themeId === 'day' ? 'День' : themeId === 'midnight' ? 'Ночь' : 'Контраст';
          return (
            <Pressable
              key={themeId}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTheme(themeId)}
              style={[
                styles.item,
                active && {
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <View style={styles.swatches}>
                <View style={[styles.dot, { backgroundColor: a, borderColor: colors.border }]} />
                <View style={[styles.dot, { backgroundColor: b, borderColor: colors.border }]} />
              </View>
              <Typography
                variant="caption"
                color={active ? colors.ink : colors.inkMuted}
                style={styles.label}
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
    paddingHorizontal: 6,
    borderRadius: radii.sm,
  },
  swatches: { flexDirection: 'row', gap: 4 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { ...typography.caption },
});
