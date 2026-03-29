import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { useMatchStore } from '@/stores/matchStore';
import { theme } from '@/constants/theme';
import { FilterBar } from '@/components/FilterBar';
import { MatchCard } from '@/components/MatchCard';
import { SportType } from '@/types';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { profile } = useAuthStore();
  const { matches, loading, filters, setFilters, fetchMatches } = useMatchStore();

  useEffect(() => {
    fetchMatches();
  }, [filters.sport]);

  const onRefresh = useCallback(() => {
    fetchMatches();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <View>
          <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
            {profile?.location ?? 'Nearby matches'}
          </Text>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800' }}>
            Matchd
          </Text>
        </View>
        <Ionicons name="location-outline" size={22} color={theme.colors.textMuted} />
      </View>

      {/* Sport Filters */}
      <FilterBar selected={filters.sport} onSelect={(sport) => setFilters({ sport })} />

      {/* Match List */}
      {loading && matches.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MatchCard match={item} />}
          contentContainerStyle={{ padding: 16, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <Text style={{ fontSize: 40 }}>🏟️</Text>
              <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '700' }}>
                No matches found
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' }}>
                Be the first to create a match in your area
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
