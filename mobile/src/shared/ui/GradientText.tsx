import React from 'react';
import { Platform, StyleSheet, Text, TextProps, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts } from './theme';

type Props = TextProps & {
  fontSize?: number;
  lineHeight?: number;
  children: string;
};

/** Акцентный текст Mapy — синий градиент */
export function GradientText({
  children,
  fontSize = 36,
  lineHeight,
  style,
  ...rest
}: Props) {
  const lh = lineHeight ?? fontSize * 1.05;

  if (Platform.OS === 'web') {
    return (
      <Text
        {...rest}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={[
          styles.base,
          {
            fontSize,
            lineHeight: lh,
            backgroundImage: 'linear-gradient(270deg, #0066FF 2%, #4C8DFF 55%, #90CAF9 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
          } as any,
          style,
        ]}
      >
        {children}
      </Text>
    );
  }

  return (
    <View>
      <LinearGradient
        colors={['#0066FF', '#4C8DFF', '#90CAF9']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.nativeWrap}
      >
        <Text
          {...rest}
          style={[
            styles.base,
            {
              fontSize,
              lineHeight: lh,
              color: colors.white,
            },
            style,
          ]}
        >
          {children}
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fonts.display,
    letterSpacing: -0.8,
  },
  nativeWrap: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
});
