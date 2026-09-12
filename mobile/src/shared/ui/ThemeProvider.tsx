import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemeStore } from '../../features/theme/theme-store';
import type { ThemeColors, ThemeId } from './theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>{children}</View>
  );
}

export function useTheme(): {
  id: ThemeId;
  colors: ThemeColors;
  setTheme: (id: ThemeId) => Promise<void>;
  cycle: () => Promise<void>;
} {
  const id = useThemeStore((s) => s.id);
  const colors = useThemeStore((s) => s.colors);
  const setTheme = useThemeStore((s) => s.setTheme);
  const cycle = useThemeStore((s) => s.cycle);
  return { id, colors, setTheme, cycle };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
