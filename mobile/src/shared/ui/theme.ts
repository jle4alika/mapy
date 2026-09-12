/**
 * Темы Mapy — строгий картографический UI.
 * day / midnight / contrast: синий акцент, нейтральные серые.
 */
export type ThemeId = 'day' | 'midnight' | 'aurora';

export type ThemeColors = {
  id: ThemeId;
  label: string;
  description: string;
  canvas: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  ink: string;
  inkMuted: string;
  inkInverse: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  cyan: string;
  pink: string;
  danger: string;
  success: string;
  tabBar: string;
  tabInactive: string;
  shell: string;
  overlay: string;
  pinFriend: string;
  pinMe: string;
  pinPlace: string;
  mapCanvas: string;
  marketingBg: string;
  marketingMuted: string;
  push1: string;
  push2: string;
  push3: string;
  black: string;
  white: string;
  yellow: string;
  gray1: string;
  gray2: string;
  gray3: string;
  yellowSoft: string;
  cyanSoft: string;
  pinkSoft: string;
};

const MAP_BLUE = '#0066FF';
const MAP_BLUE_SOFT = '#E8F0FF';

export const THEMES: Record<ThemeId, ThemeColors> = {
  day: {
    id: 'day',
    label: 'День',
    description: 'Светлая карта',
    canvas: '#F1F2F4',
    surface: '#FFFFFF',
    surfaceMuted: '#EBEDF0',
    border: '#E2E4E8',
    ink: '#141416',
    inkMuted: '#6E6E76',
    inkInverse: '#FFFFFF',
    accent: MAP_BLUE,
    accentText: '#FFFFFF',
    accentSoft: MAP_BLUE_SOFT,
    cyan: MAP_BLUE,
    pink: '#C62828',
    danger: '#C62828',
    success: '#2E7D32',
    tabBar: '#FFFFFF',
    tabInactive: '#8A8A90',
    shell: '#E6E8EC',
    overlay: 'rgba(0,0,0,0.35)',
    pinFriend: '#C62828',
    pinMe: MAP_BLUE,
    pinPlace: '#5C6B7A',
    mapCanvas: '#E8EAED',
    marketingBg: '#000000',
    marketingMuted: '#999999',
    push1: '#969696',
    push2: '#787878',
    push3: '#5A5A5A',
    black: '#000000',
    white: '#FFFFFF',
    yellow: '#F5C400',
    gray1: '#1A1A1A',
    gray2: '#6E6E76',
    gray3: '#8A8A90',
    yellowSoft: '#FFF8E0',
    cyanSoft: MAP_BLUE_SOFT,
    pinkSoft: '#FDECEC',
  },
  midnight: {
    id: 'midnight',
    label: 'Ночь',
    description: 'Тёмная карта',
    canvas: '#121212',
    surface: '#1E1E1E',
    surfaceMuted: '#2A2A2A',
    border: '#3A3A3A',
    ink: '#F2F2F2',
    inkMuted: '#A3A3A3',
    inkInverse: '#121212',
    accent: '#4C8DFF',
    accentText: '#FFFFFF',
    accentSoft: '#1A2A44',
    cyan: '#4C8DFF',
    pink: '#E57373',
    danger: '#EF5350',
    success: '#66BB6A',
    tabBar: '#1A1A1A',
    tabInactive: '#8A8A8A',
    shell: '#0A0A0A',
    overlay: 'rgba(0,0,0,0.55)',
    pinFriend: '#EF5350',
    pinMe: '#4C8DFF',
    pinPlace: '#90A4AE',
    mapCanvas: '#0F1114',
    marketingBg: '#000000',
    marketingMuted: '#999999',
    push1: '#969696',
    push2: '#787878',
    push3: '#5A5A5A',
    black: '#000000',
    white: '#FFFFFF',
    yellow: '#F5C400',
    gray1: '#2A2A2A',
    gray2: '#A3A3A3',
    gray3: '#8A8A8A',
    yellowSoft: '#3A3420',
    cyanSoft: '#1A2A44',
    pinkSoft: '#3A2020',
  },
  /** Бывшая «аврора» — спокойный контрастный тёмный режим без неона */
  aurora: {
    id: 'aurora',
    label: 'Контраст',
    description: 'Тёмный контрастный',
    canvas: '#0D0F12',
    surface: '#171A1F',
    surfaceMuted: '#22262C',
    border: '#343A42',
    ink: '#F7F8FA',
    inkMuted: '#9AA3AD',
    inkInverse: '#0D0F12',
    accent: '#5B9CFF',
    accentText: '#FFFFFF',
    accentSoft: '#182433',
    cyan: '#5B9CFF',
    pink: '#E57373',
    danger: '#EF5350',
    success: '#66BB6A',
    tabBar: '#12151A',
    tabInactive: '#7E8791',
    shell: '#08090B',
    overlay: 'rgba(0,0,0,0.6)',
    pinFriend: '#EF5350',
    pinMe: '#5B9CFF',
    pinPlace: '#90A4AE',
    mapCanvas: '#0B0D10',
    marketingBg: '#000000',
    marketingMuted: '#999999',
    push1: '#969696',
    push2: '#787878',
    push3: '#5A5A5A',
    black: '#000000',
    white: '#FFFFFF',
    yellow: '#F5C400',
    gray1: '#22262C',
    gray2: '#9AA3AD',
    gray3: '#7E8791',
    yellowSoft: '#2E2A18',
    cyanSoft: '#182433',
    pinkSoft: '#2E1A1A',
  },
};

export const THEME_ORDER: ThemeId[] = ['day', 'midnight', 'aurora'];

export const colors = THEMES.day;

export const radii = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 16,
  phone: 16,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 72,
} as const;

export const layout = {
  maxWidth: 1150,
  mobileMax: 710,
  tabletMax: 1023,
  headerHeight: 64,
  /** Левая панель на PC (как у Яндекс.Карт) */
  appPanelWidth: 420,
  /** Колонка списков, если нет panel-shell */
  appContentMax: 880,
  appContentTablet: 720,
  /** Legacy */
  appRailWidth: 84,
  appPhoneWidth: 420,
  appTabletWidth: 500,
} as const;

/**
 * Типографика Mapy (как у сильных RU-лендингов):
 * Unbounded — бренд и крупные заголовки.
 * Manrope — UI и кириллица.
 */
export const fonts = {
  display: 'Unbounded_700Bold',
  displaySemi: 'Unbounded_600SemiBold',
  displayMedium: 'Unbounded_500Medium',
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodyBold: 'Manrope_600SemiBold',
  bodyExtra: 'Manrope_700Bold',
} as const;

export const typography = {
  hero: {
    fontFamily: fonts.display,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1.8,
  },
  h1: {
    fontFamily: fonts.displaySemi,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -1.1,
  },
  h2: {
    fontFamily: fonts.displaySemi,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.8,
  },
  h3: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 23 },
  bodySmall: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  caption: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.05,
  },
  button: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  overline: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.0,
    textTransform: 'uppercase' as const,
  },
} as const;

export const theme = { colors, radii, space, fonts, typography, layout } as const;
export type Theme = typeof theme;
