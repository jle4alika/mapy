import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useAppContentMaxWidth,
  useContentPadding,
  useMainSceneOffset,
  useSideNav,
} from '../../shared/hooks/useBreakpoint';
import { useTheme } from '../../shared/ui/ThemeProvider';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  noTopInset?: boolean;
  fullBleed?: boolean;
};

export function AppPage({ children, style, noTopInset, fullBleed }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pad = useContentPadding();
  const maxW = useAppContentMaxWidth();
  const offset = useMainSceneOffset();
  const side = useSideNav();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.canvas,
          // На PC safe-area уже в шапке панели
          paddingTop: noTopInset || side ? 0 : insets.top,
          paddingLeft: offset,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.inner,
          fullBleed
            ? null
            : {
                maxWidth: maxW,
                paddingHorizontal: pad,
              },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/** Стили contentContainer для FlatList на wide */
export function useListContentStyle(extra?: ViewStyle): ViewStyle {
  const pad = useContentPadding();
  const maxW = useAppContentMaxWidth();
  return {
    flexGrow: 1,
    width: '100%',
    maxWidth: maxW,
    alignSelf: 'center',
    paddingHorizontal: pad,
    ...extra,
  };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
});
