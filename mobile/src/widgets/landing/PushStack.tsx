import React from 'react';
import { StyleSheet, View } from 'react-native';

import { MotionView } from '../../shared/motion';
import { LogoMark } from '../../shared/ui/LogoMark';
import { Typography, createShadow, fonts, radii, space } from '../../shared/ui';
import { THEMES } from '../../shared/ui/theme';

const c = THEMES.day;

/** Спокойные уведомления Mapy — для возможных вставок на лендинге */
const PUSHES = [
  { title: 'Маша на месте', body: 'Кафе на углу', time: 'сейчас' },
  { title: 'Илья в пути', body: '42 км/ч', time: '1 мин' },
  { title: 'Чат «АЗС на МКАД»', body: '2 новых сообщения', time: '3 мин' },
];

export function PushStack() {
  return (
    <View style={styles.wrap}>
      {PUSHES.map((p, index) => (
        <MotionView
          key={p.title}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: index * 10 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          style={[
            styles.card,
            createShadow('map'),
            { zIndex: 10 - index, marginTop: index === 0 ? 0 : 0 },
          ]}
        >
          <View style={styles.logo}>
            <LogoMark size={22} withWordmark={false} />
          </View>
          <View style={styles.text}>
            <View style={styles.top}>
              <Typography numberOfLines={1} style={styles.title}>
                {p.title}
              </Typography>
              <Typography style={styles.time}>{p.time}</Typography>
            </View>
            <Typography numberOfLines={1} style={styles.body}>
              {p.body}
            </Typography>
          </View>
        </MotionView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 480,
    minHeight: 180,
    alignSelf: 'center',
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: c.ink,
  },
  time: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: c.inkMuted,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: c.inkMuted,
    marginTop: 2,
  },
});
