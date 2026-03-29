import React from 'react';
import { View, Text } from 'react-native';
import { theme } from '@/constants/theme';

interface BadgeProps {
  label: string;
  color?: string;
  textColor?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  color = theme.colors.primary,
  textColor = '#fff',
  size = 'md',
}) => {
  return (
    <View
      style={{
        backgroundColor: color + '22',
        borderRadius: theme.radius.full,
        paddingHorizontal: size === 'sm' ? 8 : 10,
        paddingVertical: size === 'sm' ? 2 : 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          color: color,
          fontSize: size === 'sm' ? 11 : 12,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </View>
  );
};
