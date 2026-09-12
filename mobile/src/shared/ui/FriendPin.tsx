import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { Avatar } from './Avatar';
import { fonts } from './theme';
import { useTheme } from './ThemeProvider';
import { Typography } from './Typography';

type Props = {
  name?: string | null;
  uri?: string | null;
  size?: number;
  speed?: string | null;
  battery?: string | null;
  moving?: boolean;
  style?: ViewStyle;
  ringColor?: string;
};

/** Компактный аватар списка — без декоративных бейджей */
export function FriendPin({
  name,
  uri,
  size = 40,
  speed,
  battery,
  moving,
  style,
}: Props) {
  const { colors } = useTheme();
  const meta = speed ? `${speed} км/ч` : battery ? battery : moving ? 'в пути' : null;
  return (
    <View style={[styles.wrap, style]}>
      <Avatar uri={uri} name={name} size={size} />
      {meta ? (
        <Typography style={[styles.meta, { color: colors.inkMuted }]} numberOfLines={1}>
          {meta}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2 },
  meta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    lineHeight: 12,
  },
});
