import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Profile, PlayerRating } from '@/types';
import { theme } from '@/constants/theme';
import { Avatar } from './ui/Avatar';
import { RatingBadge } from './RatingBadge';
import { SPORTS } from '@/constants/sports';

interface PlayerCardProps {
  profile: Profile;
  rating?: PlayerRating;
  sport?: string;
  onPress?: () => void;
  showRating?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  profile,
  rating,
  onPress,
  showRating = true,
}) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) return onPress();
    router.push(`/player/${profile.id}`);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: theme.colors.surface,
        padding: 12,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Avatar uri={profile.avatar_url} name={profile.full_name ?? profile.username} size={44} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 14 }}>
          {profile.full_name ?? profile.username}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>@{profile.username}</Text>
      </View>
      {showRating && rating && (
        <RatingBadge rating={rating.rating} size="sm" />
      )}
    </TouchableOpacity>
  );
};
