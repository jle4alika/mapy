import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MessageReaction } from '../../entities/types';
import { fonts, radii, space } from '../../shared/ui';
import { useTheme } from '../../shared/ui/ThemeProvider';

type Props = {
  reactions: MessageReaction[];
  mine?: boolean;
  onPressEmoji?: (emoji: string) => void;
};

/** Чипы реакций под сообщением — визуально как в Telegram */
export function ReactionChips({ reactions, mine, onPressEmoji }: Props) {
  const { colors } = useTheme();
  if (!reactions?.length) return null;

  return (
    <View style={[styles.wrap, mine ? styles.wrapMine : styles.wrapPeer]}>
      {reactions.map((r) => (
        <Pressable
          key={r.emoji}
          onPress={() => onPressEmoji?.(r.emoji)}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: r.me ? colors.accentSoft : colors.surface,
              borderColor: r.me ? colors.accent : colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          accessibilityLabel={`реакция ${r.emoji} ${r.count}`}
        >
          <Text style={styles.emoji}>{r.emoji === '❤' ? '❤️' : r.emoji}</Text>
          {r.count > 1 ? (
            <Text style={[styles.count, { color: r.me ? colors.accent : colors.inkMuted }]}>
              {r.count}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    maxWidth: '80%',
  },
  wrapMine: { alignSelf: 'flex-end' },
  wrapPeer: { alignSelf: 'flex-start' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 26,
  },
  emoji: { fontSize: 15, lineHeight: 18 },
  count: { fontFamily: fonts.bodyMedium, fontSize: 12, marginRight: 1 },
});
