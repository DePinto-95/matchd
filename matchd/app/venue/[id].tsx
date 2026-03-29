import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';
import { Venue, Match } from '@/types';
import { SPORTS } from '@/constants/sports';
import { MatchCard } from '@/components/MatchCard';
import { Badge } from '@/components/ui/Badge';
import { Ionicons } from '@expo/vector-icons';

export default function VenueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [venueRes, matchesRes] = await Promise.all([
        supabase.from('venues').select('*').eq('id', id).single(),
        supabase
          .from('matches')
          .select('*, profiles:creator_id(id, username, avatar_url), match_participants(id, player_id, status)')
          .eq('venue_id', id)
          .in('status', ['open', 'full'])
          .order('scheduled_at', { ascending: true })
          .limit(10),
      ]);
      setVenue(venueRes.data ?? null);
      setMatches(matchesRes.data ?? []);
      setLoading(false);
    };
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.colors.textMuted }}>Venue not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View
        style={{
          padding: 20,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              backgroundColor: theme.colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 28 }}>🏟️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800' }}>
                {venue.name}
              </Text>
              {venue.verified && (
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
              )}
            </View>
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{venue.city}</Text>
          </View>
        </View>

        {venue.description && (
          <Text style={{ color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            {venue.description}
          </Text>
        )}

        {/* Address */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="location-outline" size={15} color={theme.colors.textMuted} />
          <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{venue.address}</Text>
        </View>

        {/* Contact */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {venue.phone && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${venue.phone}`)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.full,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Ionicons name="call-outline" size={14} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontSize: 12 }}>Call</Text>
            </TouchableOpacity>
          )}
          {venue.email && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${venue.email}`)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.full,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Ionicons name="mail-outline" size={14} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontSize: 12 }}>Email</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sports offered */}
        {venue.sports && venue.sports.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {venue.sports.map((s) => (
              <Badge
                key={s}
                label={`${SPORTS[s]?.emoji ?? ''} ${SPORTS[s]?.label ?? s}`}
                color={SPORTS[s]?.color ?? theme.colors.primary}
                size="sm"
              />
            ))}
          </View>
        )}
      </View>

      {/* Upcoming Matches */}
      {matches.length > 0 && (
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '700' }}>
            Upcoming Matches
          </Text>
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
