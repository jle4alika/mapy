import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { Icon, type IconName } from './Icon';
import { useTheme } from './ThemeProvider';
import { radii, typography } from './theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  icon?: IconName;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
  accessibilityLabel,
  icon,
}: Props) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const bg =
    variant === 'primary'
      ? colors.accent
      : variant === 'danger'
        ? colors.danger
        : variant === 'ghost'
          ? 'transparent'
          : variant === 'secondary'
            ? colors.surfaceMuted
            : colors.gray1;

  const labelColor =
    variant === 'primary' || variant === 'danger' || variant === 'dark'
      ? colors.accentText
      : variant === 'ghost'
        ? colors.accent
        : colors.ink;

  const border =
    variant === 'secondary'
      ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }
      : null;

  const label = loading ? (
    <ActivityIndicator color={labelColor} />
  ) : (
    <View style={styles.row}>
      {icon ? <Icon name={icon} pack="fi" size={16} color={labelColor} /> : null}
      <Text style={[styles.label, { color: labelColor }]}>{title}</Text>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg },
        border,
        variant === 'ghost' && { paddingHorizontal: 12, minHeight: 40 },
        style,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {label}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { ...typography.button },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.4 },
});
