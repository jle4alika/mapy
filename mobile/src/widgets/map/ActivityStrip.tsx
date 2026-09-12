import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import type { ActivityItem } from '../../entities/types';
import { useTheme } from '../../shared/ui/ThemeProvider';
import { Icon, Typography, createShadow, radii, space } from '../../shared/ui';

function labelFor(item: ActivityItem) {
  const name = item.username ?? 'друг';
  if (item.derived_status === 'moving') return `${name} · в пути`;
  if (item.derived_status === 'stationary') return `${name} · на месте`;
  return `${name} · в сети`;
}

type Props = {
  items: ActivityItem[];
  onPressItem?: (item: ActivityItem) => void;
};

export function ActivityStrip({ items, onPressItem }: Props) {
  const { colors } = useTheme();
  if (!items.length) return null;

  return (
    <View style={styles.outer} pointerEvents="box-none">
      <View style={[styles.wrap, createShadow('map'), { backgroundColor: colors.surface }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={items}
          keyExtractor={(i) => `${i.user_id}-${i.recorded_at ?? ''}`}
          contentContainerStyle={styles.row}
          renderItem={({ item }) => {
            const moving = item.derived_status === 'moving';
            return (
              <Pressable onPress={() => onPressItem?.(item)} style={styles.chip}>
                <Icon
                  name={moving ? 'navigation' : 'pin'}
                  pack="fi"
                  size={12}
                  color={moving ? colors.accent : colors.success}
                />
                <Typography
                  variant="caption"
                  color={colors.ink}
                  numberOfLines={1}
                  style={styles.label}
                >
                  {labelFor(item)}
                </Typography>
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { alignItems: 'flex-start' },
  wrap: {
    maxWidth: '100%',
    borderRadius: radii.md,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  row: { paddingHorizontal: space.sm, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 2,
    maxWidth: 180,
    minHeight: 40,
  },
  label: { fontSize: 12, lineHeight: 15 },
});
