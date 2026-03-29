import React from 'react';
import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
import { SportType } from '@/types';
import { SPORTS, SPORT_LIST } from '@/constants/sports';
import { theme } from '@/constants/theme';

interface FilterBarProps {
  selected: SportType | 'all';
  onSelect: (sport: SportType | 'all') => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ selected, onSelect }) => {
  const all = [{ id: 'all', label: 'All', emoji: '🏅', color: theme.colors.primary }];
  const items = [...all, ...SPORT_LIST] as const;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 4 }}
    >
      {items.map((item) => {
        const isActive = selected === item.id;
        const color = 'color' in item ? item.color : theme.colors.primary;
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onSelect(item.id as SportType | 'all')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: theme.radius.full,
              backgroundColor: isActive ? color + '22' : theme.colors.surface,
              borderWidth: 1,
              borderColor: isActive ? color : theme.colors.border,
            }}
          >
            <Text style={{ fontSize: 14 }}>{item.emoji}</Text>
            <Text
              style={{
                color: isActive ? color : theme.colors.textMuted,
                fontSize: 13,
                fontWeight: isActive ? '600' : '400',
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};
