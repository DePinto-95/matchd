import { create } from 'zustand';
import { Match, SportType } from '@/types';
import { supabase } from '@/lib/supabase';

interface MatchFilters {
  sport: SportType | 'all';
  city: string;
}

interface MatchState {
  matches: Match[];
  loading: boolean;
  filters: MatchFilters;
  setFilters: (filters: Partial<MatchFilters>) => void;
  fetchMatches: () => Promise<void>;
  fetchMatchById: (id: string) => Promise<Match | null>;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  matches: [],
  loading: false,
  filters: { sport: 'all', city: '' },

  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  fetchMatches: async () => {
    set({ loading: true });
    const { filters } = get();

    let query = supabase
      .from('matches')
      .select(`
        *,
        profiles:creator_id(id, username, avatar_url, account_type),
        venues(id, name, city, address),
        match_participants(id, player_id, team_id, status, profiles(id, username, avatar_url))
      `)
      .in('status', ['open', 'full'])
      .order('scheduled_at', { ascending: true });

    if (filters.sport !== 'all') {
      query = query.eq('sport', filters.sport);
    }

    const { data } = await query;
    set({ matches: data ?? [], loading: false });
  },

  fetchMatchById: async (id: string) => {
    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        profiles:creator_id(id, username, avatar_url, full_name, account_type),
        venues(id, name, city, address, logo_url, phone),
        match_teams(id, match_id, side, name),
        match_participants(
          id, player_id, team_id, status, joined_at,
          profiles(id, username, avatar_url, full_name)
        )
      `)
      .eq('id', id)
      .single();
    return data ?? null;
  },
}));
