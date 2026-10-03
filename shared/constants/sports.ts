import { SportType } from '@/types';

export interface SportConfig {
  id: SportType;
  label: string;
  emoji: string;
  color: string;
  teamSizes: number[];
  defaultDuration: number;
  minPlayers: number;
}

export const SPORTS: Record<SportType, SportConfig> = {
  football: {
    id: 'football',
    label: 'Football',
    emoji: '⚽',
    color: '#22c55e',
    teamSizes: [11],
    defaultDuration: 90,
    minPlayers: 14,
  },
  mini_football_5v5: {
    id: 'mini_football_5v5',
    label: 'Mini Football 5v5',
    emoji: '⚽',
    color: '#3b82f6',
    teamSizes: [5],
    defaultDuration: 60,
    minPlayers: 6,
  },
  mini_football_8v8: {
    id: 'mini_football_8v8',
    label: 'Mini Football 8v8',
    emoji: '⚽',
    color: '#8b5cf6',
    teamSizes: [8],
    defaultDuration: 70,
    minPlayers: 10,
  },
  padel: {
    id: 'padel',
    label: 'Padel',
    emoji: '🎾',
    color: '#f59e0b',
    teamSizes: [2],
    defaultDuration: 90,
    minPlayers: 2,
  },
  tennis: {
    id: 'tennis',
    label: 'Tennis',
    emoji: '🎾',
    color: '#ef4444',
    teamSizes: [1, 2],
    defaultDuration: 60,
    minPlayers: 2,
  },
  basketball: {
    id: 'basketball',
    label: 'Basketball',
    emoji: '🏀',
    color: '#f97316',
    teamSizes: [5],
    defaultDuration: 60,
    minPlayers: 6,
  },
  volleyball: {
    id: 'volleyball',
    label: 'Volleyball',
    emoji: '🏐',
    color: '#06b6d4',
    teamSizes: [6],
    defaultDuration: 60,
    minPlayers: 6,
  },
  other: {
    id: 'other',
    label: 'Other',
    emoji: '🏅',
    color: '#6b7280',
    teamSizes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    defaultDuration: 60,
    minPlayers: 2,
  },
};

export const SPORT_LIST = Object.values(SPORTS);
