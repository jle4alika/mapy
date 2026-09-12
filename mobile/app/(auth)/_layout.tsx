import React from 'react';
import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '../../src/features/auth/session-store';

export default function AuthLayout() {
  const token = useSessionStore((s) => s.token);
  if (token) return <Redirect href="/(main)/map" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
