import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Match } from '@/types';
import { theme } from '@/constants/theme';
import { SPORTS } from '@/constants/sports';
import { formatMatchDate, getSlotsText, formatPrice } from '@/lib/helpers';
import { SportIcon } from './SportIcon';
import { RatingBadge } from './RatingBadge';
import { Badge } from './ui/Badge';
import { Ionicons } from '@expo/vector-icons';

interface MatchCardProps {
  match: Match;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const router = useRouter();
  const sport = SPORTS[match.sport];
  const slotsLeft = match.max_players - match.current_players;
  const isFull = match.status === 'full';
  const isPrivate = match.is_private;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/match/${match.id}`)}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 12,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <SportIcon sport={match.sport} size={22} showBg />
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700' }}
            numberOfLines={1}
          >
            {match.title}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            {sport?.label}
          </Text>
        </View>
        {isPrivate && (
          <Ionicons name="lock-closed" size={14} color={theme.colors.textMuted} />
        )}
        <Badge
          label={isFull ? 'FULL' : `${slotsLeft} left`}
          color={isFull ? theme.colors.error : theme.colors.success}
          size="sm"
        />
      </View>

      {/* Details */}
      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="time-outline" size={13} color={theme.colors.textMuted} />
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            {formatMatchDate(match.scheduled_at)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} />
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }} numberOfLines={1}>
            {match.location_name}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        {/* Players */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="people-outline" size={14} color={theme.colors.textMuted} />
          <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600' }}>
            {getSlotsText(match.current_players, match.max_players)}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>players</Text>
        </View>

        {/* Rating range */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>Rating:</Text>
          <RatingBadge rating={match.min_rating} size="sm" />
          <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>–</Text>
          <RatingBadge rating={match.max_rating} size="sm" />
        </View>

        {/* Price */}
        <Text
          style={{
            color: match.price_per_player > 0 ? theme.colors.warning : theme.colors.success,
            fontSize: 13,
            fontWeight: '600',
          }}
        >
          {formatPrice(match.price_per_player, match.currency)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
