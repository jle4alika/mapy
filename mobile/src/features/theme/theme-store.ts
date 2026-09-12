import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { THEMES, type ThemeColors, type ThemeId, THEME_ORDER } from '../../shared/ui/theme';

const KEY = 'mapy_theme_id';

type ThemeState = {
  id: ThemeId;
  hydrated: boolean;
  colors: ThemeColors;
  hydrate: () => Promise<void>;
  setTheme: (id: ThemeId) => Promise<void>;
  cycle: () => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  id: 'day',
  hydrated: false,
  colors: THEMES.day,
  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const id = (raw as ThemeId) || 'day';
      const safe = THEMES[id] ? id : 'day';
      set({ id: safe, colors: THEMES[safe], hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  async setTheme(id) {
    if (!THEMES[id]) return;
    set({ id, colors: THEMES[id] });
    await AsyncStorage.setItem(KEY, id);
  },
  async cycle() {
    const cur = get().id;
    const idx = THEME_ORDER.indexOf(cur);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    await get().setTheme(next);
  },
}));
