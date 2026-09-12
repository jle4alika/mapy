import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MotionView, transitions } from '../../shared/motion';
import { Icon, Typography, createShadow, radii, space } from '../../shared/ui';
import { useTheme } from '../../shared/ui/ThemeProvider';
import { useToastStore, type ToastItem } from '../../features/notifications/toast-store';

const AUTO_DISMISS_MS = 5200;

function ToastCard({ item }: { item: ToastItem }) {
  const { colors } = useTheme();
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const t = setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [dismiss, item.id]);

  const accent =
    item.kind === 'error'
      ? colors.danger
      : item.kind === 'success'
        ? colors.success
        : colors.accent;

  const iconName =
    item.kind === 'error' ? 'alert' : item.kind === 'success' ? 'check' : 'info';

  return (
    <MotionView
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={transitions.sheet}
      style={[
        styles.card,
        createShadow('map'),
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.bar, { backgroundColor: accent }]} />
      <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
        <Icon name={iconName} pack="fi" size={16} color={accent} />
      </View>
      <View style={styles.body}>
        <View style={styles.head}>
          <Typography variant="bodyMedium" color={colors.ink} style={styles.title} numberOfLines={1}>
            {item.title}
          </Typography>
          <Pressable onPress={() => dismiss(item.id)} hitSlop={10} accessibilityLabel="закрыть">
            <Icon name="close" pack="fi" size={14} color={colors.inkMuted} />
          </Pressable>
        </View>
        <Typography color={colors.inkMuted} style={styles.message}>
          {item.message}
        </Typography>
      </View>
    </MotionView>
  );
}

/** Тосты: справа снизу на широком экране, снизу по центру на телефоне */
export function ToastHost() {
  const items = useToastStore((s) => s.items);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const phone = width < 720;

  if (!items.length) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          bottom: Math.max(insets.bottom, 12) + (phone ? 56 : 16),
          right: phone ? 12 : 20,
          left: phone ? 12 : undefined,
          alignItems: phone ? 'stretch' : 'flex-end',
        },
      ]}
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    zIndex: 9999,
    gap: 8,
    maxWidth: 380,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  bar: { width: 3 },
  iconWrap: {
    width: 36,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    gap: 4,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { flex: 1, fontSize: 14 },
  message: { fontSize: 13, lineHeight: 18 },
});
