import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from './ThemeProvider';
import { fonts } from './theme';
import { Typography } from './Typography';

// Лого Mapy (прозрачный mark). App icon — на белом фоне в assets/images/icon.png
const logoSource = require('../../../assets/images/logo-mark.png');

type Props = {
  size?: number;
  style?: ViewStyle;
  withWordmark?: boolean;
  /** marketing — для тёмного лендинга; product — для приложения */
  tone?: 'marketing' | 'product';
};

export function LogoMark({
  size = 28,
  style,
  withWordmark = true,
  tone = 'product',
}: Props) {
  const { colors } = useTheme();
  const marketing = tone === 'marketing';
  return (
    <View style={[styles.row, style]} accessibilityRole="header" accessibilityLabel="Mapy">
      <Image
        source={logoSource}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {withWordmark ? (
        <Typography
          variant="h3"
          color={marketing ? '#FFFFFF' : colors.ink}
          style={{
            fontFamily: fonts.displaySemi,
            letterSpacing: -0.55,
            fontSize: size * 0.72,
            lineHeight: size * 0.9,
          }}
        >
          Mapy
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
