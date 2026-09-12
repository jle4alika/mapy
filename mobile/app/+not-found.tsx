import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Typography, colors, space } from '../src/shared/ui';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'не найдено' }} />
      <View style={styles.container}>
        <Typography variant="h2">страница не найдена</Typography>
        <Link href="/" style={styles.link}>
          <Typography color={colors.accent}>на главную</Typography>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    backgroundColor: colors.canvas,
    gap: space.md,
  },
  link: { marginTop: space.md },
});
