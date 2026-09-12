import React from 'react';
import { Stack } from 'expo-router';

import { fonts } from '../../../src/shared/ui/theme';
import { useTheme } from '../../../src/shared/ui/ThemeProvider';

export default function ProfileLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.bodyBold, fontSize: 16 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="favorites" options={{ title: 'Избранные места' }} />
    </Stack>
  );
}
