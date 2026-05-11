import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

export default function ConfirmScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const handleUrl = async (url: string) => {
      const fragment = url.split('#')[1];
      if (!fragment) {
        setStatus('error');
        return;
      }
      const params = Object.fromEntries(
        fragment.split('&').map((p) => {
          const [key, ...rest] = p.split('=');
          return [key, decodeURIComponent(rest.join('='))];
        })
      );
      if (params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        setStatus(error ? 'error' : 'success');
      } else {
        setStatus('error');
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
      else setStatus('error');
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ color: theme.colors.textMuted, marginTop: 16, fontSize: 15 }}>
            Confirming your account…
          </Text>
        </>
      )}

      {status === 'success' && (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <Text style={{ fontSize: 64 }}>🎉</Text>
          <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' }}>
            Account Confirmed!
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
            Your email has been verified. You're all set — welcome to Matchd!
          </Text>
          <View style={{ marginTop: 8, width: '100%' }}>
            <Button
              label="Let's go →"
              onPress={() => router.replace('/(tabs)')}
              fullWidth
              size="lg"
            />
          </View>
        </View>
      )}

      {status === 'error' && (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <Text style={{ fontSize: 48 }}>😕</Text>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
            Link Expired or Invalid
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
            This confirmation link may have expired. Try signing up again or contact support.
          </Text>
          <View style={{ marginTop: 8, width: '100%' }}>
            <Button
              label="Back to Login"
              onPress={() => router.replace('/(auth)/login')}
              fullWidth
              size="lg"
            />
          </View>
        </View>
      )}
    </View>
  );
}
