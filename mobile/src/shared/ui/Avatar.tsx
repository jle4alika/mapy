import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { mediaUrl } from '../config/env';
import { Icon } from './Icon';
import { fonts } from './theme';
import { useTheme } from './ThemeProvider';

type Props = {
  uri?: string | null;
  name?: string | null;
  size?: number;
  style?: ViewStyle;
  ringColor?: string;
  /** Кнопка смены фото на самом аватаре (Anwhale-стиль) */
  editable?: boolean;
  onEditPress?: () => void;
  uploading?: boolean;
};

/** Плоский аватар; при editable — бейдж камеры снизу справа */
export function Avatar({
  uri,
  name,
  size = 40,
  style,
  ringColor,
  editable,
  onEditPress,
  uploading,
}: Props) {
  const { colors } = useTheme();
  const resolved = mediaUrl(uri);
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  const noRing = !ringColor || ringColor === 'transparent';
  const badge = Math.max(22, Math.round(size * 0.34));
  const iconSize = Math.max(11, Math.round(badge * 0.48));

  const face = (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surfaceMuted,
          borderColor: noRing ? colors.border : ringColor,
          borderWidth: StyleSheet.hairlineWidth * (noRing ? 1 : 2),
        },
      ]}
    >
      {resolved ? (
        <Image source={{ uri: resolved }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.36, color: colors.inkMuted }]}>
          {initial}
        </Text>
      )}
      {uploading ? (
        <View style={[styles.dim, { borderRadius: size / 2, backgroundColor: 'rgba(20,20,22,0.45)' }]}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}
    </View>
  );

  if (!editable) {
    return <View style={style}>{face}</View>;
  }

  return (
    <Pressable
      onPress={onEditPress}
      disabled={uploading}
      accessibilityRole="button"
      accessibilityLabel="сменить аватар"
      style={({ pressed }) => [styles.wrap, style, pressed && { opacity: 0.92 }]}
    >
      {face}
      <View
        style={[
          styles.badge,
          {
            width: badge,
            height: badge,
            borderRadius: badge / 2,
            backgroundColor: colors.accent,
            borderColor: colors.surface,
            right: -2,
            bottom: -2,
          },
        ]}
      >
        <Icon name="camera" pack="fi" size={iconSize} color={colors.accentText} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: { fontFamily: fonts.bodyMedium },
  dim: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
