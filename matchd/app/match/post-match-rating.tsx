import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useRatings } from '@/hooks/useRatings';
import { theme } from '@/constants/theme';
import { MatchParticipant } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function PostMatchRatingScreen() {
  const { matchId, sport } = useLocalSearchParams<{ matchId: string; sport: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { submitRating, submitting, hasRated } = useRatings(matchId ?? '', sport ?? '');

  const [opponents, setOpponents] = useState<MatchParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const loadOpponents = async () => {
      if (!matchId || !user) return;

      // Get user's team
      const { data: myParticipant } = await supabase
        .from('match_participants')
        .select('team_id')
        .eq('match_id', matchId)
        .eq('player_id', user.id)
        .single();

      // Get opponents (other team)
      const { data: all } = await supabase
        .from('match_participants')
        .select('*, profiles(id, username, avatar_url, full_name)')
        .eq('match_id', matchId)
        .neq('player_id', user.id);

      // Shuffle for random order
      const shuffled = (all ?? []).sort(() => Math.random() - 0.5);
      setOpponents(shuffled);
      setLoading(false);
    };
    loadOpponents();
  }, [matchId, user]);

  const currentPlayer = opponents[currentIndex];

  const handleRate = async () => {
    if (!currentPlayer || !user) return;
    const score = scores[currentPlayer.player_id] ?? 5;
    const comment = comments[currentPlayer.player_id] ?? '';

    const ok = await submitRating(user.id, currentPlayer.player_id, score, comment || undefined);
    if (ok && currentIndex < opponents.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleFinish = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (opponents.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 15, textAlign: 'center' }}>
          No players to rate for this match.
        </Text>
        <Button label="Done" onPress={handleFinish} />
      </View>
    );
  }

  const ratedCount = opponents.filter((p) => hasRated(p.player_id)).length;
  const allRated = currentIndex >= opponents.length;

  if (allRated) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
        <Text style={{ fontSize: 48 }}>⭐</Text>
        <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
          Ratings Submitted!
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' }}>
          You rated {ratedCount} player{ratedCount !== 1 ? 's' : ''}. Your input helps build fair ratings for everyone.
        </Text>
        <Button label="Done" onPress={handleFinish} fullWidth size="lg" />
      </View>
    );
  }

  const playerId = currentPlayer?.player_id;
  const currentScore = scores[playerId] ?? 5;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 20, gap: 24 }}
    >
      {/* Progress */}
      <View style={{ gap: 4 }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
          Player {currentIndex + 1} of {opponents.length}
        </Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {opponents.map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor: i <= currentIndex ? theme.colors.primary : theme.colors.border,
              }}
            />
          ))}
        </View>
      </View>

      {/* Player Info */}
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar
          uri={currentPlayer?.profiles?.avatar_url}
          name={currentPlayer?.profiles?.full_name ?? currentPlayer?.profiles?.username ?? '?'}
          size={72}
        />
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>
          {currentPlayer?.profiles?.full_name ?? currentPlayer?.profiles?.username}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
          @{currentPlayer?.profiles?.username}
        </Text>
      </View>

      {/* Score Picker */}
      <View style={{ gap: 12 }}>
        <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>
          How did they play?
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => setScores((s) => ({ ...s, [playerId]: n }))}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: currentScore === n ? theme.colors.primary : theme.colors.surface,
                borderWidth: 1.5,
                borderColor: currentScore === n ? theme.colors.primary : theme.colors.border,
              }}
            >
              <Text
                style={{
                  color: currentScore === n ? '#fff' : theme.colors.textMuted,
                  fontWeight: '700',
                  fontSize: 15,
                }}
              >
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, textAlign: 'center' }}>
          1 = Poor · 5 = Average · 10 = Outstanding
        </Text>
      </View>

      {/* Optional comment */}
      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '500' }}>
          Comment (optional)
        </Text>
        <TextInput
          value={comments[playerId] ?? ''}
          onChangeText={(v) => setComments((c) => ({ ...c, [playerId]: v }))}
          placeholder="Great positioning, fast..."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          style={{
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            padding: 12,
            color: theme.colors.text,
            fontSize: 14,
            minHeight: 70,
            textAlignVertical: 'top',
          }}
        />
      </View>

      {/* Actions */}
      <View style={{ gap: 10 }}>
        <Button
          label={hasRated(playerId) ? 'Rated ✓' : 'Submit Rating'}
          onPress={handleRate}
          loading={submitting}
          disabled={hasRated(playerId)}
          fullWidth
          size="lg"
        />
        {currentIndex < opponents.length - 1 && (
          <Button
            label="Skip"
            onPress={() => setCurrentIndex((i) => i + 1)}
            variant="ghost"
            fullWidth
          />
        )}
        {ratedCount > 0 && (
          <Button label="Finish Rating" onPress={handleFinish} variant="secondary" fullWidth />
        )}
      </View>
    </ScrollView>
  );
}
