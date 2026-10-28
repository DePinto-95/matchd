import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Match, SportType } from '../types';
import { createMatchService } from '../services';

interface MatchFilters {
  sport: SportType | 'all';
  city: string;
  showPast: boolean;
}

interface MatchState {
  matches: Match[];
  loading: boolean;
  filters: MatchFilters;
  setFilters: (filters: Partial<MatchFilters>) => void;
  fetchMatches: () => Promise<void>;
  fetchMatchById: (id: string) => Promise<Match | null>;
  notifyMatchCompletion: (matchId: string) => Promise<void>;
}

export interface MatchStoreOptions {
  onError?: (message: string) => void;
}

export const createMatchStore = (
  supabase: SupabaseClient,
  options: MatchStoreOptions = {}
) => {
  const matches = createMatchService(supabase);

  return create<MatchState>((set, get) => ({
    matches: [],
    loading: false,
    filters: { sport: 'all', city: '', showPast: false },

    setFilters: (filters) =>
      set((state) => ({ filters: { ...state.filters, ...filters } })),

    fetchMatches: async () => {
      set({ loading: true });
      const { sport, showPast } = get().filters;

      const { data, error } = await matches.list({ sport, showPast });
      if (error) {
        options.onError?.('Could not load matches. Please try again.');
        set({ loading: false });
        return;
      }
      set({ matches: data ?? [], loading: false });
    },

    fetchMatchById: (id: string) => matches.getById(id),

    notifyMatchCompletion: (matchId: string) => matches.notifyCompletion(matchId),
  }));
};
