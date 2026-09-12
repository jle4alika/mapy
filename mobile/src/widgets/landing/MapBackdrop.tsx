import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AmbientGlow } from './AmbientGlow';
import { LandingMapView } from './LandingMapView';

/** Hero-фон: карта + виньетка. Весь слой pe:none — иначе ест скролл/клики. */
export function MapBackdrop() {
  return (
    <View style={styles.root} pointerEvents="none">
      <LandingMapView zoom={13.4} showDemoMarkers={false} muted />
      <AmbientGlow />
      <View style={styles.vignette} pointerEvents="none" />
      <View style={styles.wash} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E8EAED',
    overflow: 'hidden',
    zIndex: 0,
  },
  vignette: {
    ...StyleSheet.absoluteFill,
    ...Platform.select({
      web: {
        backgroundImage:
          'radial-gradient(ellipse at 36% 42%, transparent 0%, rgba(242,243,245,0.12) 45%, rgba(230,233,238,0.55) 100%)',
      } as object,
      default: { backgroundColor: 'rgba(232,234,237,0.3)' },
    }),
  },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});
