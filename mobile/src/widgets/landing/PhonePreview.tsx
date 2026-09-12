import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';

import { MotionView, transitions } from '../../shared/motion';
import { Icon, Typography, fonts } from '../../shared/ui';
import { LandingMapView } from './LandingMapView';

const frame = require('../../../assets/landing/iphone-15-pro.png');

/** Доля экрана относительно PNG 391×800 (прозрачная «дыра») */
const INSET = {
  left: 0.046,
  right: 0.044,
  top: 0.019,
  bottom: 0.019,
};

/** Мягкая тень без обводки — как виджеты Яндекс.Карт */
const softPanel =
  Platform.OS === 'web'
    ? ({ boxShadow: '0 2px 10px rgba(0,0,0,0.12)' } as object)
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 3,
      };

function Chrome({
  animate,
  initial,
  delay,
  style,
  children,
  transition = transitions.reveal,
}: {
  animate: boolean;
  initial: { opacity: number; x?: number; y?: number };
  delay: number;
  style: object | object[];
  children: React.ReactNode;
  transition?: Record<string, unknown>;
}) {
  if (!animate) {
    return <View style={style as object}>{children}</View>;
  }
  return (
    <MotionView
      initial={initial}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ ...transition, delay }}
      style={style}
    >
      {children}
    </MotionView>
  );
}

/**
 * Превью в реальном мокапе iPhone 15 Pro + живая карта приложения.
 * Карта не анимируется transform'ом — только chrome поверх.
 */
export function PhonePreview({
  compact,
  animateChrome = false,
}: {
  compact?: boolean;
  /** Внутренний chrome анимируется один раз после появления телефона */
  animateChrome?: boolean;
}) {
  const frameW = compact ? 248 : 286;
  const frameH = Math.round((frameW * 800) / 391);
  const screenLeft = frameW * INSET.left;
  const screenTop = frameH * INSET.top;
  const screenW = frameW * (1 - INSET.left - INSET.right);
  const screenH = frameH * (1 - INSET.top - INSET.bottom);

  return (
    <View style={[styles.wrap, { width: frameW + 24, height: frameH + 16 }]}>
      <View style={[styles.stage, { width: frameW, height: frameH }]}>
        <View
          style={[
            styles.screen,
            {
              left: screenLeft,
              top: screenTop,
              width: screenW,
              height: screenH,
              borderRadius: screenW * 0.12,
            },
          ]}
        >
          <LandingMapView zoom={14.4} showDemoMarkers />

          <Chrome
            animate={animateChrome}
            initial={{ opacity: 0, y: -8 }}
            delay={0.55}
            style={[styles.search, softPanel]}
          >
            <Icon name="search" pack="fi" size={13} color="#8A8A8A" />
            <Typography style={styles.searchText}>Поиск на карте</Typography>
          </Chrome>

          <Chrome
            animate={animateChrome}
            initial={{ opacity: 0, y: -6 }}
            delay={0.68}
            style={[styles.strip, softPanel]}
          >
            <Icon name="navigation" pack="fi" size={11} color="#0066FF" />
            <Typography style={styles.stripText}>Маша · в пути</Typography>
          </Chrome>

          <Chrome
            animate={animateChrome}
            initial={{ opacity: 0, x: 10 }}
            delay={0.78}
            style={[styles.zoom, softPanel]}
          >
            <View style={styles.zBtn}>
              <Icon name="plus" pack="fi" size={13} color="#1A1A1A" />
            </View>
            <View style={styles.zSep} />
            <View style={styles.zBtn}>
              <Icon name="minus" pack="fi" size={13} color="#1A1A1A" />
            </View>
          </Chrome>
          <Chrome
            animate={animateChrome}
            initial={{ opacity: 0, x: 10 }}
            delay={0.86}
            style={[styles.loc, softPanel]}
          >
            <Icon name="navigation" pack="fi" size={13} color="#0066FF" />
          </Chrome>

          <Chrome
            animate={animateChrome}
            initial={{ opacity: 0, y: 28 }}
            delay={0.72}
            transition={transitions.sheet}
            style={[styles.sheet, softPanel]}
          >
            <View style={styles.sheetTop}>
              <View style={[styles.type, { backgroundColor: '#E67E22' }]}>
                <Icon name="cafe" pack="fi" size={12} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Typography style={styles.sheetTitle} numberOfLines={1}>
                  Кафе на углу
                </Typography>
                <Typography style={styles.sheetSub} numberOfLines={1}>
                  Кафе · Тверская, 12
                </Typography>
              </View>
            </View>
            <View style={styles.cta}>
              <Icon name="chats" pack="fi" size={12} color="#fff" />
              <Typography style={styles.ctaText}>Чат места</Typography>
            </View>
          </Chrome>
        </View>

        <Image
          source={frame}
          style={[styles.frame, { width: frameW, height: frameH }]}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  stage: {
    position: 'relative',
    ...Platform.select({
      web: { filter: 'drop-shadow(0 18px 40px rgba(0,0,0,0.2))' } as object,
      default: {},
    }),
  },
  screen: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: '#E8EAED',
    zIndex: 1,
  },
  frame: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 3,
  },
  search: {
    position: 'absolute',
    top: 44,
    left: 10,
    right: 10,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    zIndex: 2,
  },
  searchText: { fontSize: 13, color: '#9A9A98', fontFamily: fonts.body },
  strip: {
    position: 'absolute',
    top: 92,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    zIndex: 2,
  },
  stripText: { fontSize: 11, color: '#1A1A1A', fontFamily: fonts.bodyMedium },
  zoom: {
    position: 'absolute',
    right: 10,
    bottom: 118,
    width: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    overflow: 'hidden',
    zIndex: 2,
  },
  zBtn: { height: 34, alignItems: 'center', justifyContent: 'center' },
  zSep: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.06)' },
  loc: {
    position: 'absolute',
    right: 10,
    bottom: 74,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
    zIndex: 2,
  },
  sheetTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  type: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { fontSize: 14, fontFamily: fonts.bodyBold, color: '#1A1A1A' },
  sheetSub: { fontSize: 11, fontFamily: fonts.body, color: '#7A7A78', marginTop: 1 },
  cta: {
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0066FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ctaText: { color: '#fff', fontSize: 13, fontFamily: fonts.bodyMedium },
});
