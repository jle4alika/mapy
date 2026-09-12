import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { createShadow, ShadowLevel } from './shadow';
import { radii } from './theme';
import { useTheme } from './ThemeProvider';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  dark?: boolean;
  /** @deprecated glass blur убран — оставляем API для совместимости */
  blur?: boolean;
  shadow?: ShadowLevel;
};

/** Плоская карточка — строгая, без glassmorphism */
export function GlassCard({ children, style, dark, shadow = 'map' }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.base,
        createShadow(shadow),
        {
          backgroundColor: dark ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
