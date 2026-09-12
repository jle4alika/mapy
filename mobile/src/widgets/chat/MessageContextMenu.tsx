import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TELEGRAM_QUICK_REACTIONS } from '../../features/chat/telegramEmojis';
import { Icon, Typography, createShadow, fonts, radii, space } from '../../shared/ui';
import { useTheme } from '../../shared/ui/ThemeProvider';

type Props = {
  visible: boolean;
  mine: boolean;
  selectedEmoji?: string | null;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onDelete?: () => void;
  onOpenFullEmoji?: () => void;
};

/** Контекстное меню сообщения в стиле Telegram */
export function MessageContextMenu({
  visible,
  mine,
  selectedEmoji,
  onClose,
  onReact,
  onReply,
  onDelete,
  onOpenFullEmoji,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isWide = width >= 720;
  const [more, setMore] = useState(false);

  const reactions = useMemo(
    () => (more ? TELEGRAM_QUICK_REACTIONS : TELEGRAM_QUICK_REACTIONS.slice(0, 7)),
    [more],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          pointerEvents="box-none"
          style={[
            styles.center,
            {
              paddingTop: Math.max(insets.top, 24),
              paddingBottom: Math.max(insets.bottom, 24),
              paddingHorizontal: isWide ? 24 : 16,
            },
          ]}
        >
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={[
              styles.sheet,
              createShadow('map'),
              {
                backgroundColor: colors.surface,
                maxWidth: isWide ? 380 : Math.min(width - 32, 360),
                maxHeight: height * 0.72,
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reactRow}
              style={[styles.reactScroll, { backgroundColor: colors.surfaceMuted }]}
            >
              {reactions.map((emoji) => {
                const active = selectedEmoji === emoji || (selectedEmoji === '❤️' && emoji === '❤');
                return (
                  <Pressable
                    key={emoji}
                    onPress={() => onReact(emoji)}
                    style={({ pressed }) => [
                      styles.reactBtn,
                      active && { backgroundColor: colors.accentSoft },
                      pressed && { opacity: 0.75, transform: [{ scale: 1.12 }] },
                    ]}
                    accessibilityLabel={`реакция ${emoji}`}
                  >
                    <Text style={styles.reactEmoji}>{emoji === '❤' ? '❤️' : emoji}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => {
                  if (onOpenFullEmoji) {
                    onOpenFullEmoji();
                    return;
                  }
                  setMore((v) => !v);
                }}
                style={({ pressed }) => [
                  styles.reactBtn,
                  styles.moreBtn,
                  { backgroundColor: colors.surface },
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityLabel="ещё реакции"
              >
                <Icon name="plus" pack="fi" size={16} color={colors.inkMuted} />
              </Pressable>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable
                onPress={onReply}
                style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.surfaceMuted }]}
              >
                <Icon name="chats" pack="fi" size={18} color={colors.ink} />
                <Typography style={styles.actionLabel} color={colors.ink}>
                  Ответить
                </Typography>
              </Pressable>
              {mine && onDelete ? (
                <Pressable
                  onPress={onDelete}
                  style={({ pressed }) => [
                    styles.action,
                    pressed && { backgroundColor: colors.surfaceMuted },
                  ]}
                >
                  <Icon name="alert" pack="fi" size={18} color={colors.danger} />
                  <Typography style={styles.actionLabel} color={colors.danger}>
                    Удалить
                  </Typography>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  reactScroll: {
    maxHeight: 64,
  },
  reactRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 2,
    alignItems: 'center',
  },
  reactBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtn: {
    borderRadius: 21,
  },
  reactEmoji: {
    fontSize: Platform.OS === 'web' ? 24 : 26,
    lineHeight: Platform.OS === 'web' ? 28 : 30,
  },
  actions: {
    paddingVertical: 4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
  },
  actionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
});
