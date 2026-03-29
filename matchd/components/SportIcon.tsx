import React from 'react';
import { Text, View } from 'react-native';
import { SPORTS } from '@/constants/sports';
import { SportType } from '@/types';

interface SportIconProps {
  sport: SportType;
  size?: number;
  showBg?: boolean;
}

export const SportIcon: React.FC<SportIconProps> = ({ sport, size = 24, showBg = false }) => {
  const config = SPORTS[sport];
  const emoji = config?.emoji ?? '🏅';
  const color = config?.color ?? '#6b7280';

  if (showBg) {
    return (
      <View
        style={{
          width: size * 1.8,
          height: size * 1.8,
          borderRadius: size * 0.5,
          backgroundColor: color + '22',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: size * 0.85 }}>{emoji}</Text>
      </View>
    );
  }

  return <Text style={{ fontSize: size }}>{emoji}</Text>;
};
