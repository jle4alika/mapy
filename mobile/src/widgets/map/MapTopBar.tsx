import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Icon, Typography, createShadow, radii, space } from '../../shared/ui';
import { useTheme } from '../../shared/ui/ThemeProvider';

type Props = {
  query?: string;
  placeholder?: string;
  onPressSearch?: () => void;
};

export function MapTopBar({
  query,
  placeholder = 'Поиск на карте',
  onPressSearch,
}: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPressSearch}
        style={[
        styles.bar,
        createShadow('map'),
        { backgroundColor: colors.surface },
      ]}
      accessibilityRole="search"
      accessibilityLabel={placeholder}
    >
      <Icon name="search" pack="fi" size={16} color={colors.inkMuted} />
      <Typography
        style={styles.text}
        color={query ? colors.ink : colors.inkMuted}
        numberOfLines={1}
      >
        {query || placeholder}
      </Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 44,
    borderRadius: radii.lg,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: { flex: 1, fontSize: 14 },
});
