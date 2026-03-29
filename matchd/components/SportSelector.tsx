import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SportType } from '@/types';
import { SPORT_LIST } from '@/constants/sports';
import { theme } from '@/constants/theme';

interface SportSelectorProps {
  selected: SportType | null;
  onSelect: (sport: SportType) => void;
}

export const SportSelector: React.FC<SportSelectorProps> = ({ selected, onSelect }) => {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: '500' }}>
        Select Sport
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SPORT_LIST.map((sport) => {
          const isSelected = selected === sport.id;
          return (
            <TouchableOpacity
              key={sport.id}
              onPress={() => onSelect(sport.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: theme.radius.md,
                backgroundColor: isSelected ? sport.color + '22' : theme.colors.surfaceAlt,
                borderWidth: 1.5,
                borderColor: isSelected ? sport.color : theme.colors.border,
              }}
            >
              <Text style={{ fontSize: 18 }}>{sport.emoji}</Text>
              <Text
                style={{
                  color: isSelected ? sport.color : theme.colors.textMuted,
                  fontSize: 13,
                  fontWeight: isSelected ? '600' : '400',
                }}
              >
                {sport.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
