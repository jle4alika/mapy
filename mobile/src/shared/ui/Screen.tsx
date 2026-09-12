import React from 'react';
import { Platform, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  useAppContentMaxWidth,
  useContentPadding,
  useMainSceneOffset,
  useSideNav,
} from '../hooks/useBreakpoint';
import { useTheme } from './ThemeProvider';
import { space } from './theme';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
};

/** Web: класс для кастомных скроллбаров (+html.tsx) */
export const webScrollProps =
  Platform.OS === 'web' ? ({ className: 'mapy-scroll' } as Record<string, string>) : {};

export function Screen({
  children,
  scroll,
  style,
  dark,
  edges = ['top', 'left', 'right'],
}: Props) {
  const { colors } = useTheme();
  const bg = dark ? colors.marketingBg : colors.canvas;
  const pad = useContentPadding();
  const maxW = useAppContentMaxWidth();
  const offset = useMainSceneOffset();
  const side = useSideNav();
  const safeEdges = side ? edges.filter((e) => e !== 'top') : edges;

  const contentStyle = [
    styles.scroll,
    {
      paddingHorizontal: pad,
      paddingTop: pad,
      maxWidth: maxW,
      width: '100%' as const,
      alignSelf: 'center' as const,
    },
    style,
  ];

  const content = scroll ? (
    <ScrollView
      {...webScrollProps}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: bg }}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, { backgroundColor: bg, paddingHorizontal: pad }, style]}>
      <View style={{ flex: 1, width: '100%', maxWidth: maxW, alignSelf: 'center' }}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: bg, paddingLeft: offset }]}
      edges={safeEdges}
    >
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  scroll: { paddingBottom: space.xxxl, gap: space.md },
});
