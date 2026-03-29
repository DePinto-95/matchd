import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/hooks/useProfile';
import { theme } from '@/constants/theme';
import { SPORTS } from '@/constants/sports';
import { Avatar } from '@/components/ui/Avatar';
import { RatingBadge } from '@/components/RatingBadge';
import { MatchCard } from '@/components/MatchCard';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile: authProfile, signOut } = useAuthStore();
  const { profile, ratings, matchHistory, loading, fetchProfile } = useProfile();

  useEffect(() => {
    if (user) fetchProfile(user.id);
  }, [user]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const displayProfile = profile ?? authProfile;

  if (!displayProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header actions */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16 }}>
          {displayProfile.account_type === 'venue' && (
            <TouchableOpacity
              onPress={() => router.push('/venue/dashboard')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.full,
                borderWidth: 1,
                borderColor: theme.colors.border,
                marginRight: 8,
              }}
            >
              <Ionicons name="grid-outline" size={16} color={theme.colors.textMuted} />
              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>Dashboard</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.push('/squad/index')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.full,
              borderWidth: 1,
              borderColor: theme.colors.border,
              marginRight: 8,
            }}
          >
            <Ionicons name="people-outline" size={16} color={theme.colors.textMuted} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>Squads</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={24} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Profile card */}
        <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
          <Avatar
            uri={displayProfile.avatar_url}
            name={displayProfile.full_name ?? displayProfile.username}
            size={80}
          />
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800' }}>
            {displayProfile.full_name ?? displayProfile.username}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
            @{displayProfile.username}
          </Text>
          {displayProfile.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} />
              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                {displayProfile.location}
              </Text>
            </View>
          )}
          {displayProfile.bio && (
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: 13,
                textAlign: 'center',
                paddingHorizontal: 32,
                lineHeight: 19,
              }}
            >
              {displayProfile.bio}
            </Text>
          )}
        </View>

        {/* Sport Ratings */}
        {ratings.length > 0 && (
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '700' }}>
              Sport Ratings
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {ratings.map((r) => {
                const sport = SPORTS[r.sport];
                return (
                  <View
                    key={r.id}
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.radius.md,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      alignItems: 'center',
                      gap: 6,
                      minWidth: 90,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{sport?.emoji ?? '🏅'}</Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>
                      {sport?.label ?? r.sport}
                    </Text>
                    <RatingBadge rating={r.rating} size="md" />
                    <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>
                      {r.total_matches} matches
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Match history */}
        {matchHistory.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 24, gap: 12 }}>
            <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '700' }}>
              Recent Matches
            </Text>
            {matchHistory.slice(0, 5).map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
