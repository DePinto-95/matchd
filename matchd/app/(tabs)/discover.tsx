import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';
import { Match } from '@/types';
import { MatchCard } from '@/components/MatchCard';
import { SPORT_LIST } from '@/constants/sports';
import { SportIcon } from '@/components/SportIcon';
import { Ionicons } from '@expo/vector-icons';

export default function DiscoverScreen() {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (q: string) => {
    setLoading(true);
    let dbQuery = supabase
      .from('matches')
      .select(`
        *,
        profiles:creator_id(id, username, avatar_url),
        venues(id, name, city),
        match_participants(id, player_id, status)
      `)
      .in('status', ['open', 'full'])
      .order('scheduled_at', { ascending: true });

    if (q.trim()) {
      dbQuery = dbQuery.or(
        `title.ilike.%${q}%,location_name.ilike.%${q}%`
      );
    }

    const { data } = await dbQuery.limit(30);
    setMatches(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    search('');
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      {/* Header */}
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800' }}>
          Discover
        </Text>

        {/* Search */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
            gap: 8,
          }}
        >
          <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search matches, locations..."
            placeholderTextColor={theme.colors.textMuted}
            style={{ flex: 1, color: theme.colors.text, paddingVertical: 12, fontSize: 15 }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sport quick-links */}
        {!query && (
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {SPORT_LIST.slice(0, 6).map((sport) => (
              <TouchableOpacity
                key={sport.id}
                onPress={() => setQuery(sport.label)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  backgroundColor: sport.color + '18',
                  borderRadius: theme.radius.full,
                }}
              >
                <Text style={{ fontSize: 14 }}>{sport.emoji}</Text>
                <Text style={{ color: sport.color, fontSize: 12, fontWeight: '500' }}>
                  {sport.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Results */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MatchCard match={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <Text style={{ fontSize: 36 }}>🔍</Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 15 }}>
                No matches found
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
