import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useMatchStore } from '@/stores/matchStore';
import { useMatchRealtime } from '@/hooks/useRealtime';
import { theme } from '@/constants/theme';
import { Match } from '@/types';
import { SPORTS } from '@/constants/sports';
import { formatMatchDate, formatPrice, isMatchPast } from '@/lib/helpers';
import { SportIcon } from '@/components/SportIcon';
import { TeamSlots } from '@/components/TeamSlots';
import { RatingBadge } from '@/components/RatingBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Ionicons } from '@expo/vector-icons';

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { fetchMatchById } = useMatchStore();

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const loadMatch = useCallback(async () => {
    if (!id) return;
    const data = await fetchMatchById(id);
    setMatch(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  useMatchRealtime(id ?? '', loadMatch);

  const isParticipant = match?.match_participants?.some((p) => p.player_id === user?.id);
  const isCreator = match?.creator_id === user?.id;
  const isFull = match?.status === 'full';
  const isPast = match ? isMatchPast(match.scheduled_at, match.duration_minutes) : false;

  const handleJoin = async () => {
    if (!match || !user) return;
    setJoining(true);

    // Check rating eligibility
    const { data: userRating } = await supabase
      .from('player_ratings')
      .select('rating')
      .eq('player_id', user.id)
      .eq('sport', match.sport)
      .single();

    const rating = userRating?.rating ?? 5.0;
    if (rating < match.min_rating || rating > match.max_rating) {
      setJoining(false);
      Alert.alert(
        'Rating Required',
        `This match requires a ${match.sport} rating between ${match.min_rating} and ${match.max_rating}. Your current rating is ${rating.toFixed(1)}.`
      );
      return;
    }

    // Pick team with fewer players
    const homeTeam = match.match_teams?.find((t) => t.side === 'home');
    const awayTeam = match.match_teams?.find((t) => t.side === 'away');
    const homePlayers = match.match_participants?.filter((p) => p.team_id === homeTeam?.id).length ?? 0;
    const awayPlayers = match.match_participants?.filter((p) => p.team_id === awayTeam?.id).length ?? 0;
    const targetTeam = homePlayers <= awayPlayers ? homeTeam : awayTeam;

    const { error } = await supabase.from('match_participants').insert({
      match_id: match.id,
      player_id: user.id,
      team_id: targetTeam?.id ?? null,
      status: 'confirmed',
    });

    setJoining(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      loadMatch();
    }
  };

  const handleLeave = async () => {
    if (!match || !user) return;
    Alert.alert('Leave Match', 'Are you sure you want to leave this match?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('match_participants')
            .delete()
            .eq('match_id', match.id)
            .eq('player_id', user.id);
          loadMatch();
        },
      },
    ]);
  };

  const handleCancel = async () => {
    if (!match) return;
    Alert.alert('Cancel Match', 'This will cancel the match for all participants.', [
      { text: 'Go Back', style: 'cancel' },
      {
        text: 'Cancel Match',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('matches').update({ status: 'cancelled' }).eq('id', match.id);
          router.back();
        },
      },
    ]);
  };

  const handleShare = async () => {
    if (!match) return;
    const text = match.is_private && match.invite_code
      ? `Join my ${SPORTS[match.sport].label} match on Matchd! Code: ${match.invite_code}`
      : `Check out this ${SPORTS[match.sport].label} match on Matchd: ${match.title}`;
    Share.share({ message: text });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.colors.textMuted }}>Match not found</Text>
      </View>
    );
  }

  const sport = SPORTS[match.sport];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View
          style={{
            backgroundColor: sport.color + '18',
            padding: 20,
            paddingTop: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <SportIcon sport={match.sport} size={28} showBg />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800' }}>
                {match.title}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{sport.label}</Text>
            </View>
            <Badge
              label={match.status.replace('_', ' ').toUpperCase()}
              color={
                match.status === 'open'
                  ? theme.colors.success
                  : match.status === 'full'
                  ? theme.colors.warning
                  : theme.colors.error
              }
            />
          </View>

          {/* Key info */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
              <Text style={{ color: theme.colors.text, fontSize: 14 }}>
                {formatMatchDate(match.scheduled_at)} · {match.duration_minutes}min
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="location-outline" size={16} color={theme.colors.textMuted} />
              <Text style={{ color: theme.colors.text, fontSize: 14 }}>{match.location_name}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="people-outline" size={16} color={theme.colors.textMuted} />
              <Text style={{ color: theme.colors.text, fontSize: 14 }}>
                {match.current_players}/{match.max_players} players · {match.team_size}v{match.team_size}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>Rating:</Text>
                <RatingBadge rating={match.min_rating} size="sm" />
                <Text style={{ color: theme.colors.textMuted }}>–</Text>
                <RatingBadge rating={match.max_rating} size="sm" />
              </View>
              <Text
                style={{
                  color: match.price_per_player > 0 ? theme.colors.warning : theme.colors.success,
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                {formatPrice(match.price_per_player, match.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {match.description && (
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
              {match.description}
            </Text>
          </View>
        )}

        {/* Team Slots */}
        {match.match_teams && match.match_teams.length > 0 && (
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '700', marginBottom: 16 }}>
              Teams
            </Text>
            <TeamSlots
              teams={match.match_teams}
              participants={match.match_participants ?? []}
              teamSize={match.team_size}
            />
          </View>
        )}

        {/* Creator */}
        {match.profiles && (
          <TouchableOpacity
            onPress={() => router.push(`/player/${match.profiles!.id}`)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <Avatar
              uri={match.profiles.avatar_url}
              name={match.profiles.full_name ?? match.profiles.username}
              size={36}
            />
            <View>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Created by</Text>
              <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>
                {match.profiles.full_name ?? match.profiles.username}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        {/* Venue */}
        {match.venues && (
          <TouchableOpacity
            onPress={() => router.push(`/venue/${match.venues!.id}`)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 16,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: theme.colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18 }}>🏟️</Text>
            </View>
            <View>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Venue</Text>
              <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>
                {match.venues.name}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: theme.colors.background,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          padding: 16,
          paddingBottom: 28,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={handleShare}
            style={{
              width: 46,
              height: 46,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="share-outline" size={20} color={theme.colors.text} />
          </TouchableOpacity>

          {isPast && isParticipant && (
            <Button
              label="Rate Players"
              onPress={() => router.push({ pathname: '/match/post-match-rating', params: { matchId: match.id, sport: match.sport } })}
              fullWidth
            />
          )}

          {!isPast && !isParticipant && !isFull && match.status === 'open' && (
            <Button label="Join Match" onPress={handleJoin} loading={joining} fullWidth />
          )}

          {!isPast && isParticipant && !isCreator && (
            <Button label="Leave Match" onPress={handleLeave} variant="danger" fullWidth />
          )}

          {isCreator && match.status !== 'cancelled' && (
            <Button label="Cancel Match" onPress={handleCancel} variant="danger" fullWidth />
          )}

          {isFull && !isParticipant && (
            <Button label="Match Full" onPress={() => {}} disabled fullWidth />
          )}
        </View>
      </View>
    </View>
  );
}
