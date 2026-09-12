import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, createShadow, radii } from '../../shared/ui';
import { useTheme } from '../../shared/ui/ThemeProvider';

type Props = {
  onLocate?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
};

export function MapSideControls({ onLocate, onZoomIn, onZoomOut }: Props) {
  const { colors } = useTheme();
  const surface = { backgroundColor: colors.surface };

  return (
    <View style={styles.wrap}>
      <View style={[styles.group, createShadow('map'), surface]}>
        <Pressable
          onPress={onZoomIn}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          accessibilityLabel="приблизить"
        >
          <Icon name="plus" pack="fi" size={17} color={colors.ink} />
        </Pressable>
        <View style={styles.sep} />
        <Pressable
          onPress={onZoomOut}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          accessibilityLabel="отдалить"
        >
          <Icon name="minus" pack="fi" size={17} color={colors.ink} />
        </Pressable>
      </View>

      <Pressable
        onPress={onLocate}
        style={({ pressed }) => [
          styles.locate,
          createShadow('map'),
          surface,
          pressed && styles.pressed,
        ]}
        accessibilityLabel="моя геолокация"
      >
        <Icon name="navigation" pack="fi" size={16} color={colors.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, alignItems: 'flex-end' },
  group: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sep: { height: StyleSheet.hairlineWidth, width: 44, backgroundColor: 'rgba(128,128,128,0.25)' },
  locate: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
});
