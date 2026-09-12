import { useWindowDimensions } from 'react-native';

import { layout } from '../ui/theme';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/** Брейкпоинты: телефон / планшет / десктоп */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width >= layout.tabletMax + 1) return 'desktop';
  if (width >= layout.mobileMax + 1) return 'tablet';
  return 'mobile';
}

/** PC/tablet: слева панель + карта справа (Yandex-like) */
export function useSideNav(): boolean {
  return useBreakpoint() !== 'mobile';
}

/**
 * Горизонтальные поля.
 * В panel-shell на wide — компактные 16 (панель уже ~400px).
 * На мобилке — 16.
 */
export function useContentPadding(): number {
  const side = useSideNav();
  const { width } = useWindowDimensions();
  if (side) return 16;
  if (width >= 711) return 20;
  return 16;
}

/** Макс. ширина колонки; в panel-shell не нужна */
export function useAppContentMaxWidth(): number | undefined {
  if (useSideNav()) return undefined;
  const bp = useBreakpoint();
  if (bp === 'desktop') return layout.appContentMax;
  if (bp === 'tablet') return layout.appContentTablet;
  return undefined;
}

/** Раньше — absolute rail; теперь панель in-flow → смещения нет */
export function useMainSceneOffset(): number {
  return 0;
}

/** @deprecated */
export function useAppColumnWidth(): number | '100%' {
  return '100%';
}

export function useIsNarrow(): boolean {
  const { width, height } = useWindowDimensions();
  return height < 800 || width < 380;
}
