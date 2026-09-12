import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

/** Мягкие орбы без motion — motion.div перехватывал скролл поверх карты */
export function AmbientGlow() {
  return (
    <View style={styles.root} pointerEvents="none">
      <View style={[styles.orb, styles.orbBlue]} />
      <View style={[styles.orb, styles.orbCyan]} />
      <View style={[styles.orb, styles.orbSoft]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    zIndex: 0,
    pointerEvents: 'none',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    pointerEvents: 'none',
    ...Platform.select({
      web: { filter: 'blur(90px)' } as object,
      default: { opacity: 0.45 },
    }),
  },
  orbBlue: {
    width: 420,
    height: 420,
    top: -120,
    right: -80,
    backgroundColor: 'rgba(0,102,255,0.18)',
  },
  orbCyan: {
    width: 340,
    height: 340,
    bottom: '8%',
    left: -100,
    backgroundColor: 'rgba(76,141,255,0.14)',
  },
  orbSoft: {
    width: 280,
    height: 280,
    top: '42%',
    left: '38%',
    backgroundColor: 'rgba(255,255,255,0.55)',
    opacity: 0.35,
  },
});
