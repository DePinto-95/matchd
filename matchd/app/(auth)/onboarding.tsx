import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { theme } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { AccountType } from '@/types';

const OPTIONS: { type: AccountType; emoji: string; title: string; description: string }[] = [
  {
    type: 'player',
    emoji: '⚽',
    title: 'Player',
    description: 'Find and join matches, build your rating, play with friends and strangers.',
  },
  {
    type: 'venue',
    emoji: '🏟️',
    title: 'Sports Center / Venue',
    description: 'Manage your facilities, handle bookings, and list your pitches for matches.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, fetchProfile } = useAuthStore();
  const [selected, setSelected] = useState<AccountType>('player');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!user) return;
    setLoading(true);

    const { data: authUser } = await supabase.auth.getUser();
    const username = authUser.user?.user_metadata?.username ?? `user_${user.id.slice(0, 6)}`;

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      account_type: selected,
      username,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', 'Could not save profile. Please try again.');
      return;
    }

    await fetchProfile(user.id);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }}>
        <View style={{ marginBottom: 40, marginTop: 24 }}>
          <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: '800' }}>
            How will you use Matchd?
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 15, marginTop: 8 }}>
            Choose your account type. You can always update this later.
          </Text>
        </View>

        <View style={{ gap: 16, flex: 1 }}>
          {OPTIONS.map((option) => {
            const isSelected = selected === option.type;
            return (
              <TouchableOpacity
                key={option.type}
                onPress={() => setSelected(option.type)}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radius.xl,
                  padding: 20,
                  borderWidth: 2,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  gap: 12,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                }}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: theme.radius.md,
                    backgroundColor: isSelected ? theme.colors.primary + '22' : theme.colors.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{option.emoji}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={{
                      color: isSelected ? theme.colors.primary : theme.colors.text,
                      fontSize: 17,
                      fontWeight: '700',
                    }}
                  >
                    {option.title}
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 }}>
                    {option.description}
                  </Text>
                </View>
                {isSelected && (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: theme.colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          label="Continue →"
          onPress={handleContinue}
          loading={loading}
          fullWidth
          size="lg"
          // @ts-ignore
          style={{ marginTop: 36 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
