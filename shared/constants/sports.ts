import { SportType } from '../enums';

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
  [SportType.Football]: {
    id: SportType.Football,
    label: 'Football',
    emoji: '⚽',
    color: '#22c55e',
    teamSizes: [11],
    defaultDuration: 90,
    minPlayers: 14,
  },
  [SportType.MiniFootball5v5]: {
    id: SportType.MiniFootball5v5,
    label: 'Mini Football 5v5',
    emoji: '⚽',
    color: '#3b82f6',
    teamSizes: [5],
    defaultDuration: 60,
    minPlayers: 6,
  },
  [SportType.MiniFootball8v8]: {
    id: SportType.MiniFootball8v8,
    label: 'Mini Football 8v8',
    emoji: '⚽',
    color: '#8b5cf6',
    teamSizes: [8],
    defaultDuration: 70,
    minPlayers: 10,
  },
  [SportType.Padel]: {
    id: SportType.Padel,
    label: 'Padel',
    emoji: '🎾',
    color: '#f59e0b',
    teamSizes: [2],
    defaultDuration: 90,
    minPlayers: 2,
  },
  [SportType.Tennis]: {
    id: SportType.Tennis,
    label: 'Tennis',
    emoji: '🎾',
    color: '#ef4444',
    teamSizes: [1, 2],
    defaultDuration: 60,
    minPlayers: 2,
  },
  [SportType.Basketball]: {
    id: SportType.Basketball,
    label: 'Basketball',
    emoji: '🏀',
    color: '#f97316',
    teamSizes: [5],
    defaultDuration: 60,
    minPlayers: 6,
  },
  [SportType.Volleyball]: {
    id: SportType.Volleyball,
    label: 'Volleyball',
    emoji: '🏐',
    color: '#06b6d4',
    teamSizes: [6],
    defaultDuration: 60,
    minPlayers: 6,
  },
  [SportType.Other]: {
    id: SportType.Other,
    label: 'Other',
    emoji: '🏅',
    color: '#6b7280',
    teamSizes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    defaultDuration: 60,
    minPlayers: 2,
  },
};

export const SPORT_LIST = Object.values(SPORTS);
