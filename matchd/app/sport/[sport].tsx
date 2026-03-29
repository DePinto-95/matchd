import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';
import { Match, SportType } from '@/types';
import { SPORTS } from '@/constants/sports';
import { MatchCard } from '@/components/MatchCard';

export default function SportBrowseScreen() {
  const { sport } = useLocalSearchParams<{ sport: string }>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const sportConfig = sport ? SPORTS[sport as SportType] : null;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('matches')
        .select('*, profiles:creator_id(id, username, avatar_url), match_participants(id, player_id, status)')
        .eq('sport', sport)
        .in('status', ['open', 'full'])
        .order('scheduled_at', { ascending: true });
      setMatches(data ?? []);
      setLoading(false);
    };
    if (sport) load();
  }, [sport]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Text style={{ fontSize: 28 }}>{sportConfig?.emoji ?? '🏅'}</Text>
        <View>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800' }}>
            {sportConfig?.label ?? sport}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
            {matches.length} open match{matches.length !== 1 ? 'es' : ''}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MatchCard match={item} />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <Text style={{ fontSize: 36 }}>{sportConfig?.emoji ?? '🏅'}</Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 15 }}>
                No {sportConfig?.label} matches open right now
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
