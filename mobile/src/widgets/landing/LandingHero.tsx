import React from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { MotionView, Reveal, transitions } from '../../shared/motion';
import {
  Button,
  Icon,
  LogoMark,
  Typography,
  createShadow,
  fonts,
  layout,
  type IconName,
} from '../../shared/ui';
import { useBreakpoint, useContentPadding, useIsNarrow } from '../../shared/hooks/useBreakpoint';
import { LandingFooter } from './LandingFooter';
import { MapBackdrop } from './MapBackdrop';
import { LandingMapView } from './LandingMapView';
import { PhonePreview } from './PhonePreview';

const ink = '#141416';
const muted = '#6E6E76';
const accent = '#0066FF';
const surface = '#FFFFFF';
const canvas = '#F1F2F4';
const border = '#E2E4E8';

type Props = {
  onLogin: () => void;
  onRegister: () => void;
  onOpenApp: () => void;
};

const METRICS = [
  { value: '115k+', label: 'мест по РФ' },
  { value: 'live', label: 'позиции друзей' },
  { value: 'chat', label: 'у каждой точки' },
];

const SCENARIO = [
  {
    title: 'Друзья',
    icon: 'friends' as IconName,
    text: 'Кто в пути, кто уже на месте. Позиции двигаются плавно, без лишних эффектов.',
  },
  {
    title: 'Места',
    icon: 'pin' as IconName,
    text: 'Пин кафе или АЗС — и чат именно этой точки: очередь, цены, советы.',
  },
  {
    title: 'Россия',
    icon: 'map' as IconName,
    text: 'Точки из открытых данных по стране. Карта подгружает район, который смотрите.',
  },
];

function FloatCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
  delay?: number;
  floatDelay?: number;
  amp?: number;
}) {
  return (
    <View style={[styles.floatCard, softFloatShadow, style]} pointerEvents="none">
      <View style={styles.floatInner} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const softFloatShadow =
  Platform.OS === 'web'
    ? ({ boxShadow: '0 8px 28px rgba(0,0,0,0.1)' } as object)
    : createShadow('map');

export function LandingHero({ onLogin, onRegister, onOpenApp }: Props) {
  const bp = useBreakpoint();
  const pad = useContentPadding();
  const narrow = useIsNarrow();
  const { height } = useWindowDimensions();
  const wide = bp !== 'mobile';
  const heroMin = Math.max(720, Math.min(height * 0.98, 960));

  return (
    <View style={[styles.hero, { minHeight: heroMin }]}>
      <MapBackdrop />

      <View style={[styles.inner, { paddingHorizontal: pad, maxWidth: layout.maxWidth }]}>
        <View style={[styles.nav, glassNav]}>
          <LogoMark size={20} />
          <View style={styles.navActions}>
            <Pressable onPress={onLogin} hitSlop={10}>
              <Typography style={styles.navLink}>Войти</Typography>
            </Pressable>
            <Pressable
              onPress={onOpenApp}
              style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.88 }]}
            >
              <Icon name="map" pack="fi" size={13} color="#fff" />
              <Typography style={styles.navBtnText}>Открыть карту</Typography>
            </Pressable>
          </View>
        </View>

        <View style={[styles.row, wide && styles.rowWide]}>
          <MotionView
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transitions.revealSlow, delay: 0.12 }}
            style={[styles.panelCol, wide && styles.panelWide]}
          >
            <View style={[styles.panel, glassPanel, createShadow('map')]}>
              <Typography style={styles.brand}>Mapy</Typography>
              <Typography
                style={[
                  styles.headline,
                  {
                    fontSize: wide ? 34 : narrow ? 24 : 28,
                    lineHeight: wide ? 38 : narrow ? 28 : 32,
                  },
                ]}
              >
                Друзья на карте.{'\n'}Чаты у мест.
              </Typography>
              <Typography style={styles.lead}>
                Живая карта по всей России: видите, где ваши люди, и пишете в чат конкретной точки —
                заправки, кафе, магазина.
              </Typography>
              <View style={styles.ctaRow}>
                <Button title="Начать бесплатно" icon="map" onPress={onRegister} style={styles.cta} />
                <Pressable onPress={onLogin} hitSlop={8} style={styles.secondaryRow}>
                  <Icon name="profile" pack="fi" size={14} color={accent} />
                  <Typography style={styles.secondaryLink}>Уже есть аккаунт</Typography>
                </Pressable>
              </View>

              <View style={styles.metrics}>
                {METRICS.map((m) => (
                  <View key={m.label} style={styles.metric}>
                    <Typography style={styles.metricValue}>{m.value}</Typography>
                    <Typography style={styles.metricLabel}>{m.label}</Typography>
                  </View>
                ))}
              </View>
            </View>
          </MotionView>

          <View style={styles.phoneStage}>
            {/* Карту не float'им — WebGL в CSS-transform даёт рваный кадр */}
            <MotionView
              initial={{ opacity: 0, y: 28, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...transitions.revealSlow, delay: 0.2 }}
              style={styles.phoneWrap}
            >
              <PhonePreview compact={!wide || narrow} />
            </MotionView>

            {wide ? (
              <>
                <FloatCard style={styles.floatTop}>
                  <Icon name="navigation" pack="fi" size={14} color={accent} />
                  <View>
                    <Typography style={styles.floatTitle}>Маша · в пути</Typography>
                    <Typography style={styles.floatSub}>42 км/ч · 3 мин назад</Typography>
                  </View>
                </FloatCard>
                <FloatCard style={styles.floatBottom}>
                  <View style={[styles.floatDot, { backgroundColor: '#2E7D32' }]}>
                    <Icon name="gas" pack="fi" size={12} color="#fff" />
                  </View>
                  <View>
                    <Typography style={styles.floatTitle}>АЗС на МКАД</Typography>
                    <Typography style={styles.floatSub}>2 новых в чате</Typography>
                  </View>
                </FloatCard>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

export function LandingSections({
  onRegister,
  onLogin,
}: {
  onRegister?: () => void;
  onLogin?: () => void;
}) {
  const pad = useContentPadding();
  const bp = useBreakpoint();
  const wide = bp !== 'mobile';

  return (
    <View style={styles.sections}>
      <View style={[styles.marqueeBand, { paddingHorizontal: pad }]}>
        <Reveal y={12} style={[styles.marqueeInner, { maxWidth: layout.maxWidth }]}>
          {['Кафе', 'АЗС', 'Магазины', 'Парки', 'Транспорт', 'Чаты мест', 'Друзья live'].map(
            (t) => (
              <View key={t} style={styles.marqueeChip}>
                <Typography style={styles.marqueeText}>{t}</Typography>
              </View>
            ),
          )}
        </Reveal>
      </View>

      <View style={[styles.band, { paddingHorizontal: pad }]}>
        <View style={[styles.bandInner, { maxWidth: layout.maxWidth }]}>
          <Reveal>
            <View style={styles.kickerRow}>
              <Icon name="navigation" pack="fi" size={14} color={accent} />
              <Typography style={styles.kicker}>Сценарий</Typography>
            </View>
            <Typography style={styles.h2}>
              Открыли карту — сразу понятно,{'\n'}что происходит
            </Typography>
          </Reveal>
          <View style={[styles.scenario, wide && styles.scenarioWide]}>
            {SCENARIO.map((item, i) => (
              <Reveal key={item.title} delay={0.08 * i} style={[styles.scenarioItem, wide && { flex: 1 }]}>
                <View style={styles.scenarioIcon}>
                  <Icon name={item.icon} pack="fi" size={18} color={accent} />
                </View>
                <Typography style={styles.scenarioTitle}>{item.title}</Typography>
                <Typography style={styles.scenarioText}>{item.text}</Typography>
              </Reveal>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.feature, { backgroundColor: '#EBEDF0', paddingHorizontal: pad }]}>
        <View style={[styles.featureInner, wide && styles.featureInnerWide, { maxWidth: layout.maxWidth }]}>
          <Reveal style={styles.featureCopy}>
            <View style={styles.kickerRow}>
              <Icon name="friends" pack="fi" size={14} color={accent} />
              <Typography style={styles.kicker}>Друзья</Typography>
            </View>
            <Typography style={styles.h2}>Как Zenly, но в строгой карте</Typography>
            <Typography style={styles.featureText}>
              Аватары на карте, статусы «в пути» и «на месте», лента активности сверху. Всё читается
              с первого взгляда — как в привычных геосервисах.
            </Typography>
          </Reveal>
          <Reveal delay={0.12} style={[styles.mapPanel, createShadow('map')]}>
            <LandingMapView zoom={14} showDemoMarkers />
          </Reveal>
        </View>
      </View>

      <View style={[styles.feature, { paddingHorizontal: pad }]}>
        <View
          style={[
            styles.featureInner,
            wide && styles.featureInnerWideRev,
            { maxWidth: layout.maxWidth },
          ]}
        >
          <Reveal style={styles.featureCopy}>
            <View style={styles.kickerRow}>
              <Icon name="chats" pack="fi" size={14} color={accent} />
              <Typography style={styles.kicker}>Чаты мест</Typography>
            </View>
            <Typography style={styles.h2}>Разговор про точку, а не общий чат</Typography>
            <Typography style={styles.featureText}>
              Открыли пин — открыли чат. Удобно, когда едете и нужно быстро узнать, что там сейчас:
              бензин, очередь, свободный столик.
            </Typography>
          </Reveal>
          <Reveal delay={0.1} style={[styles.chatPanel, createShadow('map')]}>
            <View style={styles.chatHead}>
              <View style={[styles.chatType, { backgroundColor: '#2E7D32' }]}>
                <Icon name="gas" pack="fi" size={16} color="#fff" />
              </View>
              <View>
                <Typography style={styles.chatTitle}>АЗС на МКАД</Typography>
                <Typography style={styles.chatSub}>АЗС · чат места</Typography>
              </View>
            </View>
            {[
              { out: false, text: '95 есть, очередь небольшая' },
              { out: true, text: 'Ок, буду через 10' },
              { out: false, text: 'На третьей колонке свободно' },
            ].map((b) => (
              <View key={b.text} style={b.out ? styles.bubbleOut : styles.bubbleIn}>
                <Typography style={[styles.bubbleText, b.out && { color: '#fff' }]}>{b.text}</Typography>
              </View>
            ))}
          </Reveal>
        </View>
      </View>

      {/* Приватность — светлая */}
      <View style={[styles.band, { paddingHorizontal: pad, backgroundColor: canvas }]}>
        <View style={[styles.bandInner, { maxWidth: layout.maxWidth }]}>
          <Reveal>
            <View style={styles.kickerRow}>
              <Icon name="shield" pack="fi" size={14} color={accent} />
              <Typography style={styles.kicker}>Приватность</Typography>
            </View>
            <Typography style={styles.h2}>
              Вы решаете, кто{'\n'}и как вас видит
            </Typography>
            <Typography style={[styles.featureText, { maxWidth: 520, marginTop: 4 }]}>
              Обычный режим, приближённая позиция или заморозка геолокации — для каждого друга отдельно
              и на нужный срок.
            </Typography>
          </Reveal>
          <View style={[styles.modes, wide && { flexDirection: 'row' }]}>
            {(
              [
                { t: 'Обычно', d: 'Точная позиция', icon: 'eye' as IconName },
                { t: 'Примерно', d: 'Радиус рядом', icon: 'pin' as IconName },
                { t: 'Заморозка', d: 'На время', icon: 'lock' as IconName },
              ] as const
            ).map((m, i) => (
              <Reveal key={m.t} delay={0.1 * i} style={[styles.modeCard, wide && { flex: 1 }]}>
                <View style={styles.modeIcon}>
                  <Icon name={m.icon} pack="fi" size={16} color={accent} />
                </View>
                <Typography style={styles.modeT}>{m.t}</Typography>
                <Typography style={styles.modeD}>{m.d}</Typography>
              </Reveal>
            ))}
          </View>
        </View>
      </View>

      <LandingFooter onRegister={onRegister} onLogin={onLogin} />
    </View>
  );
}

const glassNav = Platform.select({
  web: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    backdropFilter: 'blur(16px)',
  } as object,
  default: { backgroundColor: 'rgba(255,255,255,0.94)' },
});

const glassPanel = Platform.select({
  web: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(18px)',
  } as object,
  default: { backgroundColor: 'rgba(255,255,255,0.94)' },
});

const styles = StyleSheet.create({
  hero: { position: 'relative', overflow: 'hidden' },
  inner: {
    width: '100%',
    alignSelf: 'center',
    flex: 1,
    zIndex: 2,
    paddingBottom: 48,
  },
  nav: {
    marginTop: 16,
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 6,
  },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navLink: { fontFamily: fonts.bodyMedium, fontSize: 14, color: ink },
  navBtn: {
    backgroundColor: accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBtnText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 13 },
  row: { flex: 1, paddingTop: 36, gap: 28, justifyContent: 'center' },
  rowWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 28,
  },
  panelCol: { maxWidth: 480 },
  panelWide: { flex: 1 },
  panel: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: border,
    padding: 28,
    gap: 12,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: -2.2,
    color: ink,
  },
  headline: {
    fontFamily: fonts.displaySemi,
    letterSpacing: -1.2,
    color: ink,
    marginTop: 2,
  },
  lead: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: muted,
    maxWidth: 400,
    marginTop: 2,
  },
  ctaRow: { gap: 12, marginTop: 10, alignItems: 'flex-start' },
  cta: { minHeight: 46, paddingHorizontal: 20 },
  secondaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  secondaryLink: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: accent,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: border,
  },
  metric: { gap: 2, minWidth: 88 },
  metricValue: {
    fontFamily: fonts.displaySemi,
    fontSize: 22,
    letterSpacing: -0.8,
    color: ink,
  },
  metricLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: muted,
  },
  phoneStage: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 520,
  },
  phoneWrap: { alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  floatCard: {
    position: 'absolute',
    zIndex: 5,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
      } as object,
      default: {},
    }),
  },
  floatInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatTop: { top: 48, left: -8 },
  floatBottom: { bottom: 110, right: -4 },
  floatDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: ink },
  floatSub: { fontFamily: fonts.body, fontSize: 11, color: muted, marginTop: 1 },

  sections: { backgroundColor: canvas },
  marqueeBand: { paddingVertical: 28, backgroundColor: surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: border },
  marqueeInner: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  marqueeChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: border,
    backgroundColor: canvas,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  marqueeText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: ink },

  band: { paddingVertical: 88, backgroundColor: surface },
  bandInner: { width: '100%', alignSelf: 'center', gap: 10 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: accent,
  },
  h2: {
    fontFamily: fonts.displaySemi,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.4,
    color: ink,
    maxWidth: 620,
  },
  scenario: { marginTop: 36, gap: 28 },
  scenarioWide: { flexDirection: 'row', gap: 28 },
  scenarioItem: { gap: 10 },
  scenarioIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  scenarioTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    letterSpacing: -0.6,
    color: ink,
  },
  scenarioText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: muted },

  feature: { paddingVertical: 88 },
  featureInner: { width: '100%', alignSelf: 'center', gap: 36 },
  featureInnerWide: { flexDirection: 'row', alignItems: 'center', gap: 56 },
  featureInnerWideRev: { flexDirection: 'row-reverse', alignItems: 'center', gap: 56 },
  featureCopy: { flex: 1, gap: 12, maxWidth: 460 },
  featureText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: muted,
  },
  mapPanel: {
    flex: 1,
    height: 340,
    minHeight: 300,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: border,
    backgroundColor: '#E8EAED',
    position: 'relative',
  },
  chatPanel: {
    flex: 1,
    minHeight: 280,
    borderRadius: 18,
    backgroundColor: surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: border,
    padding: 22,
    gap: 10,
    justifyContent: 'center',
  },
  chatHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  chatType: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTitle: { fontFamily: fonts.displaySemi, fontSize: 15, letterSpacing: -0.4, color: ink },
  chatSub: { fontFamily: fonts.body, fontSize: 12, color: muted },
  bubbleIn: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F1F2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    maxWidth: '90%',
  },
  bubbleOut: {
    alignSelf: 'flex-end',
    backgroundColor: accent,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    maxWidth: '80%',
  },
  bubbleText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: ink },

  modes: { gap: 14, marginTop: 28 },
  modeCard: {
    gap: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: border,
    backgroundColor: surface,
    padding: 18,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as object,
      default: {},
    }),
  },
  modeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  modeT: {
    fontFamily: fonts.displaySemi,
    fontSize: 17,
    letterSpacing: -0.5,
    color: ink,
  },
  modeD: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: muted },
});
