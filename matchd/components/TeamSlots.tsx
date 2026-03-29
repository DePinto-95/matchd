import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MatchTeam, MatchParticipant } from '@/types';
import { theme } from '@/constants/theme';
import { Avatar } from './ui/Avatar';
import { Ionicons } from '@expo/vector-icons';

interface TeamSlotsProps {
  teams: MatchTeam[];
  participants: MatchParticipant[];
  teamSize: number;
}

export const TeamSlots: React.FC<TeamSlotsProps> = ({ teams, participants, teamSize }) => {
  const homeTeam = teams.find((t) => t.side === 'home');
  const awayTeam = teams.find((t) => t.side === 'away');

  const homeParticipants = participants.filter((p) => p.team_id === homeTeam?.id);
  const awayParticipants = participants.filter((p) => p.team_id === awayTeam?.id);

  const renderSlots = (teamParticipants: MatchParticipant[], color: string) => {
    return Array.from({ length: teamSize }).map((_, i) => {
      const participant = teamParticipants[i];
      if (participant?.profiles) {
        return (
          <View key={i} style={{ alignItems: 'center', gap: 4, width: 56 }}>
            <Avatar
              uri={participant.profiles.avatar_url}
              name={participant.profiles.full_name ?? participant.profiles.username}
              size={44}
            />
            <Text
              style={{ color: theme.colors.textMuted, fontSize: 10 }}
              numberOfLines={1}
            >
              {participant.profiles.username}
            </Text>
          </View>
        );
      }
      return (
        <View key={i} style={{ alignItems: 'center', gap: 4, width: 56 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              borderWidth: 1.5,
              borderColor: color + '55',
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="person-add-outline" size={16} color={color + '88'} />
          </View>
          <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>Open</Text>
        </View>
      );
    });
  };

  return (
    <View style={{ gap: 16 }}>
      {/* VS Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
        <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' }}>
          VS
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {/* Home Team */}
        <View style={{ flex: 1, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' }} />
            <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '700' }}>
              {homeTeam?.name ?? 'Home'}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              {homeParticipants.length}/{teamSize}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', maxWidth: 300 }}>
              {renderSlots(homeParticipants, '#3b82f6')}
            </View>
          </ScrollView>
        </View>

        {/* Divider */}
        <View style={{ width: 1, backgroundColor: theme.colors.border }} />

        {/* Away Team */}
        <View style={{ flex: 1, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f97316' }} />
            <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '700' }}>
              {awayTeam?.name ?? 'Away'}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              {awayParticipants.length}/{teamSize}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', maxWidth: 300 }}>
              {renderSlots(awayParticipants, '#f97316')}
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
};
