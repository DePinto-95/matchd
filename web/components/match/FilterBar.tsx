'use client';

import { SPORT_LIST } from '@/constants/sports';
import { SportType } from '@/types';

interface FilterBarProps {
  selected: SportType | 'all';
  onSelect: (sport: SportType | 'all') => void;
}

export function FilterBar({ selected, onSelect }: FilterBarProps) {
  const options = [{ id: 'all' as const, label: 'All', emoji: '🏅' }, ...SPORT_LIST];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {options.map((sport) => {
        const active = selected === sport.id;
        return (
          <button
            key={sport.id}
            onClick={() => onSelect(sport.id as SportType | 'all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0
              ${active
                ? 'bg-brand text-white shadow-sm shadow-brand/30'
                : 'bg-surface-alt text-text-muted hover:text-text hover:bg-border border border-border'
              }`}
          >
            <span>{sport.emoji}</span>
            <span>{sport.label}</span>
          </button>
        );
      })}
    </div>
  );
}
