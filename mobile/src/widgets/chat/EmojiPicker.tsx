import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  TELEGRAM_EMOJI_CATEGORIES,
  TELEGRAM_QUICK_REACTIONS,
} from '../../features/chat/telegramEmojis';
import { Icon, Typography, fonts, radii, space, webScrollProps } from '../../shared/ui';
import { useTheme } from '../../shared/ui/ThemeProvider';

type Props = {
  visible: boolean;
  mode?: 'compose' | 'react';
  onClose: () => void;
  onPick: (emoji: string) => void;
};

/** Панель эмодзи в духе Telegram (категории + сетка) */
export function EmojiPicker({ visible, mode = 'compose', onClose, onPick }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isWide = width >= 720;
  const [catId, setCatId] = useState(TELEGRAM_EMOJI_CATEGORIES[0].id);

  const category = useMemo(
    () => TELEGRAM_EMOJI_CATEGORIES.find((c) => c.id === catId) ?? TELEGRAM_EMOJI_CATEGORIES[0],
    [catId],
  );

  if (!visible) return null;

  const panelH = Math.min(isWide ? 340 : 300, height * 0.42);
  const cols = isWide ? 10 : width < 380 ? 7 : 8;
  const cell = Math.floor((Math.min(width, isWide ? 420 : width) - 24) / cols);
  const reactEmojis = TELEGRAM_QUICK_REACTIONS;

  return (
    <View
      style={[
        styles.panel,
        {
          height: panelH + Math.max(insets.bottom, 0),
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
          maxWidth: isWide ? 420 : undefined,
          alignSelf: isWide ? 'center' : 'stretch',
          width: '100%',
        },
      ]}
    >
      <View style={styles.head}>
        <Typography variant="caption" color={colors.inkMuted}>
          {mode === 'react' ? 'Реакция' : 'Эмодзи'}
        </Typography>
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="закрыть эмодзи">
          <Icon name="close" pack="fi" size={18} color={colors.inkMuted} />
        </Pressable>
      </View>

      {mode === 'react' ? (
        <ScrollView
          {...webScrollProps}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.grid, { paddingBottom: space.sm }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.gridInner}>
            {reactEmojis.map((emoji) => (
              <Pressable
                key={`react-${emoji}`}
                onPress={() => onPick(emoji)}
                style={({ pressed }) => [
                  styles.cell,
                  { width: cell, height: cell },
                  pressed && { backgroundColor: colors.surfaceMuted, borderRadius: 8 },
                ]}
              >
                <Text style={styles.cellEmoji}>{emoji === '❤' ? '❤️' : emoji}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cats}
            style={{ maxHeight: 44 }}
          >
            {TELEGRAM_EMOJI_CATEGORIES.map((c) => {
              const active = c.id === catId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCatId(c.id)}
                  style={[styles.catBtn, active && { backgroundColor: colors.accentSoft }]}
                  accessibilityLabel={c.label}
                >
                  <Text style={styles.catIcon}>{c.icon}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView
            {...webScrollProps}
            style={{ flex: 1 }}
            contentContainerStyle={[styles.grid, { paddingBottom: space.sm }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.gridInner}>
              {category.emojis.map((emoji) => (
                <Pressable
                  key={`${category.id}-${emoji}`}
                  onPress={() => onPick(emoji)}
                  style={({ pressed }) => [
                    styles.cell,
                    { width: cell, height: cell },
                    pressed && { backgroundColor: colors.surfaceMuted, borderRadius: 8 },
                  ]}
                >
                  <Text style={styles.cellEmoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingTop: 10,
    paddingBottom: 4,
  },
  quickRow: {
    paddingHorizontal: space.sm,
    gap: 2,
    alignItems: 'center',
  },
  quickBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickEmoji: { fontSize: 22 },
  cats: {
    paddingHorizontal: space.sm,
    gap: 4,
    alignItems: 'center',
  },
  catBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIcon: { fontSize: 18 },
  grid: { paddingHorizontal: 8 },
  gridInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmoji: {
    fontSize: Platform.OS === 'web' ? 22 : 24,
  },
});
