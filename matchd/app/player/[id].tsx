import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/authStore';
import { theme } from '@/constants/theme';
import { SPORTS } from '@/constants/sports';
import { Avatar } from '@/components/ui/Avatar';
import { RatingBadge } from '@/components/RatingBadge';
import { MatchCard } from '@/components/MatchCard';
import { Ionicons } from '@expo/vector-icons';

export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { profile, ratings, matchHistory, loading, fetchProfile } = useProfile();

  useEffect(() => {
    if (id) fetchProfile(id);
  }, [id]);

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const isOwnProfile = user?.id === id;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View
        style={{
          alignItems: 'center',
          padding: 24,
          gap: 8,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Avatar
          uri={profile.avatar_url}
          name={profile.full_name ?? profile.username}
          size={80}
        />
        <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800' }}>
          {profile.full_name ?? profile.username}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
          @{profile.username}
        </Text>
        {profile.location && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{profile.location}</Text>
          </View>
        )}
        {profile.bio && (
          <Text style={{ color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 24, lineHeight: 19 }}>
            {profile.bio}
          </Text>
        )}
        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 32, marginTop: 8 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>
              {ratings.reduce((s, r) => s + r.total_matches, 0)}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Matches</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>
              {ratings.length}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Sports</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>
              {ratings.reduce((s, r) => s + r.wins, 0)}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Wins</Text>
          </View>
        </View>
      </View>

      {/* Sport Ratings */}
      {ratings.length > 0 && (
        <View style={{ padding: 16, gap: 12 }}>
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
                    {r.rating_count} ratings
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Match History */}
      {matchHistory.length > 0 && (
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '700' }}>
            Recent Matches
          </Text>
          {matchHistory.slice(0, 5).map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
