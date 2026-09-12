import React from 'react';
import { Redirect, Stack, useSegments } from 'expo-router';

import { useSessionStore } from '../../src/features/auth/session-store';

export default function MarketingLayout() {
  const token = useSessionStore((s) => s.token);
  const segments = useSegments();

  if (token && segments[0] === '(marketing)') {
    return <Redirect href="/(main)/map" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
