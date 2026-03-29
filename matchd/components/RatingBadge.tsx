import React from 'react';
import { View, Text } from 'react-native';
import { getRatingColor } from '@/constants/theme';
import { formatRating } from '@/lib/helpers';

interface RatingBadgeProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({
  rating,
  size = 'md',
  showLabel = false,
}) => {
  const color = getRatingColor(rating);
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 18 : 14;
  const pad = size === 'sm' ? { px: 6, py: 2 } : size === 'lg' ? { px: 12, py: 6 } : { px: 8, py: 3 };

  return (
    <View
      style={{
        backgroundColor: color + '22',
        borderRadius: 6,
        paddingHorizontal: pad.px,
        paddingVertical: pad.py,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontWeight: '700', fontSize }}>
        {formatRating(rating)}{showLabel ? '/10' : ''}
      </Text>
    </View>
  );
};
