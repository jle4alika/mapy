import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

import { useTheme } from './ThemeProvider';
import { typography } from './theme';

type Variant = keyof typeof typography;

type Props = TextProps & {
  variant?: Variant;
  color?: string;
};

export function Typography({ variant = 'body', color, style, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <Text style={[typography[variant], { color: color ?? colors.ink }, style]} {...rest} />
  );
}

export const textStyles = StyleSheet.create({
  muted: { opacity: 0.72 },
});
