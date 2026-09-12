import React, { useEffect } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { LandingHero, LandingSections } from '../../src/widgets/landing/LandingHero';
import { THEMES } from '../../src/shared/ui/theme';

const c = THEMES.day;

type StyleSnapshot = {
  el: HTMLElement;
  position: string;
  height: string;
  minHeight: string;
  top: string;
  left: string;
  right: string;
  bottom: string;
  overflow: string;
  flex: string;
  display: string;
};

/**
 * Expo/RN Stack на вебе кладёт экраны в absoluteFill.
 * Если body/#root = height:auto (для document scroll), цепочка схлопывается в 0px —
 * текст остаётся в DOM, а на экране пустой canvas. Разворачиваем предков лендинга.
 */
function unlockLandingDocumentScroll() {
  if (typeof document === 'undefined') return () => undefined;

  const landing = document.getElementById('mapy-landing');
  const snapshots: StyleSnapshot[] = [];

  const patch = (el: HTMLElement, extras?: Partial<CSSStyleDeclaration>) => {
    snapshots.push({
      el,
      position: el.style.position,
      height: el.style.height,
      minHeight: el.style.minHeight,
      top: el.style.top,
      left: el.style.left,
      right: el.style.right,
      bottom: el.style.bottom,
      overflow: el.style.overflow,
      flex: el.style.flex,
      display: el.style.display,
    });
    el.style.position = 'relative';
    el.style.height = 'auto';
    el.style.top = 'auto';
    el.style.left = 'auto';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.flex = 'none';
    if (extras) {
      Object.assign(el.style, extras);
    }
  };

  const html = document.documentElement;
  const body = document.body;
  patch(html, { overflow: 'auto', minHeight: '100vh' });
  patch(body, { overflow: 'auto', minHeight: '100vh' });

  let node: HTMLElement | null = landing;
  while (node && node !== body) {
    const isLanding = node.id === 'mapy-landing';
    const isRoot = node.id === 'root';
    patch(node, {
      minHeight: isLanding || isRoot ? '100vh' : node.style.minHeight,
      display: isRoot ? 'block' : node.style.display,
      overflow: isLanding ? 'visible' : node.style.overflow,
    });
    node = node.parentElement;
  }

  return () => {
    for (const s of snapshots.reverse()) {
      s.el.style.position = s.position;
      s.el.style.height = s.height;
      s.el.style.minHeight = s.minHeight;
      s.el.style.top = s.top;
      s.el.style.left = s.left;
      s.el.style.right = s.right;
      s.el.style.bottom = s.bottom;
      s.el.style.overflow = s.overflow;
      s.el.style.flex = s.flex;
      s.el.style.display = s.display;
    }
  };
}

export default function LandingScreen() {
  const router = useRouter();
  const goLogin = () => router.push('/(auth)/login');
  const goRegister = () => router.push('/(auth)/register');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const run = () => {
      if (cancelled) return;
      if (!document.getElementById('mapy-landing')) {
        requestAnimationFrame(run);
        return;
      }
      cleanup = unlockLandingDocumentScroll();
    };
    run();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  const content = (
    <>
      <LandingHero onLogin={goLogin} onRegister={goRegister} onOpenApp={goLogin} />
      <LandingSections onRegister={goRegister} onLogin={goLogin} />
    </>
  );

  return (
    <>
      <StatusBar style="dark" />
      {Platform.OS === 'web' ? (
        <View nativeID="mapy-landing" style={styles.webPage}>
          {content}
        </View>
      ) : (
        <ScrollView
          style={styles.root}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.canvas },
  content: { flexGrow: 1, backgroundColor: c.canvas },
  webPage: {
    width: '100%',
    backgroundColor: c.canvas,
    minHeight: '100vh' as unknown as number,
  },
});
