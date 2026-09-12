import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '../src/processes/AppProviders';
import { useTheme } from '../src/shared/ui/ThemeProvider';

function RootNav() {
  const { colors, id } = useTheme();
  const dark = id === 'midnight';
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen name="(marketing)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="invite/[username]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNav />
    </AppProviders>
  );
}
