import React from 'react';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Reveal } from '../../shared/motion';
import { Button, Icon, LogoMark, Typography, fonts, layout } from '../../shared/ui';
import { useBreakpoint, useContentPadding } from '../../shared/hooks/useBreakpoint';

const ink = '#141416';
const muted = '#6E6E76';
const accent = '#0066FF';
const border = '#E8EAED';
const surface = '#FFFFFF';

type Col = {
  title: string;
  links: { label: string; href?: string; onPress?: () => void }[];
};

type Props = {
  onRegister?: () => void;
  onLogin?: () => void;
};

/**
 * Белый футер: CTA-блок + навигация + юридическая полоса.
 * Один финальный акцент, без серого фона и дублей.
 */
export function LandingFooter({ onRegister, onLogin }: Props) {
  const pad = useContentPadding();
  const bp = useBreakpoint();
  const wide = bp !== 'mobile';

  const cols: Col[] = [
    {
      title: 'Продукт',
      links: [
        { label: 'Карта', href: '/(auth)/login' },
        { label: 'Чаты мест', href: '/(auth)/login' },
        { label: 'Друзья', href: '/(auth)/login' },
      ],
    },
    {
      title: 'Аккаунт',
      links: [
        { label: 'Войти', onPress: onLogin },
        { label: 'Регистрация', onPress: onRegister },
        { label: 'Приватность', href: '/(auth)/login' },
      ],
    },
    {
      title: 'Компания',
      links: [
        { label: 'Поддержка' },
        { label: 'Политика' },
        { label: 'Условия' },
      ],
    },
  ];

  return (
    <View style={styles.root}>
      {/* Финальный CTA */}
      <View style={[styles.ctaBand, { paddingHorizontal: pad }]}>
        <View style={[styles.ctaInner, { maxWidth: layout.maxWidth }, wide && styles.ctaInnerWide]}>
          <Reveal style={styles.ctaCopy}>
            <LogoMark size={18} />
            <Typography style={styles.ctaBrand}>Mapy</Typography>
            <Typography style={styles.ctaLead}>
              Откройте карту и будьте рядом — даже когда далеко.
            </Typography>
            <View style={styles.ctaActions}>
              {onRegister ? (
                <Button
                  title="Создать аккаунт"
                  icon="userPlus"
                  onPress={onRegister}
                  style={styles.ctaBtn}
                />
              ) : null}
              <Pressable onPress={onLogin} hitSlop={8} style={styles.ctaSecondary}>
                <Icon name="map" pack="fi" size={14} color={accent} />
                <Typography style={styles.ctaSecondaryText}>Открыть карту</Typography>
              </Pressable>
            </View>
          </Reveal>

          <Reveal delay={0.1} style={[styles.navGrid, wide && styles.navGridWide]}>
            {cols.map((col) => (
              <View key={col.title} style={styles.col}>
                <Typography style={styles.colTitle}>{col.title}</Typography>
                {col.links.map((link) => {
                  const label = <Typography style={styles.link}>{link.label}</Typography>;
                  if (link.href) {
                    return (
                      <Link key={link.label} href={link.href as `/`} style={styles.linkHit}>
                        {label}
                      </Link>
                    );
                  }
                  return (
                    <Pressable
                      key={link.label}
                      onPress={link.onPress}
                      hitSlop={6}
                      style={styles.linkHit}
                    >
                      {label}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </Reveal>
        </View>
      </View>

      {/* Нижняя полоса */}
      <View style={[styles.legal, { paddingHorizontal: pad }]}>
        <View style={[styles.legalInner, { maxWidth: layout.maxWidth }]}>
          <Typography style={styles.copy}>© {new Date().getFullYear()} Mapy</Typography>
          <View style={styles.legalRight}>
            <View style={styles.pill}>
              <View style={styles.pillDot} />
              <Typography style={styles.pillText}>Карта по всей России</Typography>
            </View>
            <Typography style={styles.tagline}>Сделано для тех, кто в пути</Typography>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: border,
  },
  ctaBand: {
    paddingTop: 72,
    paddingBottom: 56,
  },
  ctaInner: {
    width: '100%',
    alignSelf: 'center',
    gap: 40,
  },
  ctaInnerWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 64,
  },
  ctaCopy: {
    flex: 1,
    maxWidth: 420,
    gap: 10,
  },
  ctaBrand: {
    fontFamily: fonts.display,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.8,
    color: ink,
    marginTop: 6,
  },
  ctaLead: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: muted,
    maxWidth: 360,
  },
  ctaActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
  },
  ctaBtn: { minHeight: 44, paddingHorizontal: 18 },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  ctaSecondaryText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: accent,
  },
  navGrid: {
    gap: 28,
  },
  navGridWide: {
    flexDirection: 'row',
    gap: 44,
    paddingTop: 8,
  },
  col: { gap: 10, minWidth: 112 },
  colTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: muted,
    marginBottom: 4,
  },
  linkHit: { paddingVertical: 4 },
  link: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: ink,
  },
  legal: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: border,
    paddingVertical: 18,
    backgroundColor: surface,
  },
  legalInner: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: { fontFamily: fonts.body, fontSize: 13, color: muted },
  legalRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F4F6F8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: border,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E7D32',
  },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: ink },
  tagline: { fontFamily: fonts.body, fontSize: 13, color: muted },
});
