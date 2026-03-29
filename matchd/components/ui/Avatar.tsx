import React from 'react';
import { View, Text, Image } from 'react-native';
import { theme } from '@/constants/theme';
import { getInitials } from '@/lib/helpers';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ uri, name = '?', size = 40 }) => {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.surfaceAlt,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.colors.primary + '33',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: size * 0.35 }}>
        {getInitials(name)}
      </Text>
    </View>
  );
};
