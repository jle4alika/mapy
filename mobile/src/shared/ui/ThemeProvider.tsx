import React, { useEffect, useLayoutEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useThemeStore } from '../../features/theme/theme-store';
import type { ThemeColors, ThemeId } from './theme';

const useIsoLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

function scrollThumbFor(colors: ThemeColors): { thumb: string; hover: string } {
  if (colors.id === 'midnight') {
    return {
      thumb: 'rgba(200, 200, 200, 0.32)',
      hover: 'rgba(240, 240, 240, 0.5)',
    };
  }
  return {
    thumb: 'rgba(110, 110, 118, 0.45)',
    hover: 'rgba(20, 20, 22, 0.7)',
  };
}

function applyWebScrollVars(colors: ThemeColors) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const root = document.documentElement;
  const { thumb, hover } = scrollThumbFor(colors);
  root.dataset.theme = colors.id;
  root.style.colorScheme = colors.id === 'midnight' ? 'dark' : 'light';
  root.style.setProperty('--mapy-scroll-track', 'transparent');
  root.style.setProperty('--mapy-scroll-thumb', thumb);
  root.style.setProperty('--mapy-scroll-thumb-hover', hover);
  root.style.setProperty('--mapy-canvas', colors.canvas);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', colors.canvas);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colors = useThemeStore((s) => s.colors);

  useIsoLayoutEffect(() => {
    applyWebScrollVars(colors);
  }, [colors]);

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
