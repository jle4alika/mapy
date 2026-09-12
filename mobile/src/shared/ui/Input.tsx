import React, { useState } from 'react';
import {
  Platform,
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
import { webScrollProps } from './Screen';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  dark?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  /** Web: Enter отправляет (onSubmitEditing), Shift+Enter — новая строка */
  enterToSubmit?: boolean;
};

export function Input({
  label,
  error,
  dark,
  style,
  containerStyle,
  onFocus,
  onBlur,
  onKeyDown,
  onSubmitEditing,
  enterToSubmit,
  multiline,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: dark ? colors.gray3 : colors.inkMuted }]}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={dark ? 'rgba(255,255,255,0.28)' : colors.inkMuted}
        multiline={multiline}
        {...(Platform.OS === 'web' && multiline ? webScrollProps : null)}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        onSubmitEditing={onSubmitEditing}
        // @ts-expect-error RN-web keyboard
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (!enterToSubmit) return;
          const key = e?.key ?? e?.nativeEvent?.key;
          if (key !== 'Enter') return;
          if (e?.shiftKey || e?.nativeEvent?.shiftKey) return;
          e?.preventDefault?.();
          e?.stopPropagation?.();
          e?.nativeEvent?.preventDefault?.();
          onSubmitEditing?.({ nativeEvent: { text: '' } } as never);
        }}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
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
            ...(Platform.OS === 'web' && multiline
              ? ({ overflowY: 'auto', resize: 'none' } as object)
              : null),
          },
          style,
        ]}
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
  multiline: {
    textAlignVertical: 'top',
  },
  error: { ...typography.caption },
});
