import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { useTheme } from './ThemeProvider';
import { radii, space, typography } from './theme';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  dark?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export function Input({ label, error, dark, style, containerStyle, onFocus, onBlur, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: dark ? colors.gray3 : colors.inkMuted }]}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={dark ? 'rgba(255,255,255,0.28)' : colors.inkMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            borderColor: error
              ? colors.danger
              : focused
                ? colors.accent
                : dark
                  ? 'transparent'
                  : colors.border,
            backgroundColor: dark ? colors.gray1 : colors.surfaceMuted,
            color: dark ? colors.white : colors.ink,
            borderWidth: focused || error ? 1.5 : StyleSheet.hairlineWidth,
          },
          style,
        ]}
        {...rest}
      />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, width: '100%' },
  label: {
    ...typography.caption,
    letterSpacing: 0.1,
  },
  input: {
    ...typography.body,
    minHeight: 46,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
  },
  error: { ...typography.caption },
});
