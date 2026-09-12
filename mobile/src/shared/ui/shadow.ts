import { Platform, ViewStyle } from 'react-native';

export type ShadowLevel = 'none' | 'soft' | 'card' | 'pin' | 'fab' | 'glow' | 'map';

type ShadowSpec = {
  web: string;
  ios: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
  };
  android: { elevation: number; shadowColor?: string };
};

/** Минимальные тени — без «мультяшного» объёма */
const SPECS: Record<ShadowLevel, ShadowSpec> = {
  none: {
    web: 'none',
    ios: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
    android: { elevation: 0 },
  },
  soft: {
    web: '0 1px 2px rgba(0,0,0,0.08)',
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
    android: { elevation: 1, shadowColor: '#000' },
  },
  map: {
    web: '0 2px 10px rgba(0,0,0,0.10)',
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
    android: { elevation: 3, shadowColor: '#000' },
  },
  card: {
    web: '0 4px 16px rgba(0,0,0,0.08)',
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
    android: { elevation: 2, shadowColor: '#000' },
  },
  pin: {
    web: '0 1px 2px rgba(0,0,0,0.2)',
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 2 },
    android: { elevation: 2, shadowColor: '#000' },
  },
  fab: {
    web: '0 1px 3px rgba(0,0,0,0.16)',
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.14, shadowRadius: 3 },
    android: { elevation: 3, shadowColor: '#000' },
  },
  glow: {
    web: '0 1px 3px rgba(0,0,0,0.14)',
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3 },
    android: { elevation: 2, shadowColor: '#000' },
  },
};

export function createShadow(level: ShadowLevel = 'soft'): ViewStyle {
  const spec = SPECS[level];
  if (Platform.OS === 'web') {
    return { boxShadow: spec.web } as ViewStyle;
  }
  if (Platform.OS === 'android') {
    return { elevation: spec.android.elevation, shadowColor: spec.android.shadowColor };
  }
  return { ...spec.ios };
}
