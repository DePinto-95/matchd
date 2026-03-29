import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/stores/authStore';
import { theme } from '@/constants/theme';
import '../global.css';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, profile, initialized } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;

    const inAuth = segments[0] === '(auth)';

    if (!session) {
      // Not logged in → go to login
      if (!inAuth) router.replace('/(auth)/login');
    } else if (!profile) {
      // Logged in but no profile → onboarding
      if (segments[1] !== 'onboarding') router.replace('/(auth)/onboarding');
    } else {
      // Logged in with profile → main app
      if (inAuth) router.replace('/(tabs)');
    }
  }, [session, profile, initialized, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    initialize().then((fn) => { cleanup = fn; });
    return () => cleanup?.();
  }, []);

  return (
    <AuthGuard>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="match/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
            headerTitle: '',
            headerBackTitle: 'Back',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="match/post-match-rating"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
            headerTitle: 'Rate Players',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="player/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
            headerTitle: '',
          }}
        />
        <Stack.Screen
          name="venue/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
            headerTitle: '',
          }}
        />
        <Stack.Screen
          name="venue/dashboard"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
            headerTitle: 'Venue Dashboard',
          }}
        />
        <Stack.Screen
          name="squad/index"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
            headerTitle: 'My Squads',
          }}
        />
        <Stack.Screen
          name="squad/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
            headerTitle: 'Squad',
          }}
        />
        <Stack.Screen
          name="sport/[sport]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
            headerTitle: '',
          }}
        />
      </Stack>
    </AuthGuard>
  );
}
