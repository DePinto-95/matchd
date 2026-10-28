import type { SupabaseClient } from '@supabase/supabase-js';
import { MatchStatus, ParticipantStatus, SportType, TeamSide } from '../enums';
import { Match } from '../types';
import { withTimeout } from '../lib/helpers';
import { DataResult, MutationResult } from './types';

/** Columns selected for the home/discover feed. */
const FEED_SELECT = `
  *,
  profiles:creator_id(id, username, avatar_url, account_type),
  venues(id, name, city, address),
  match_participants(id, player_id, team_id, status, extra_spots, extra_spots_opponent, profiles(id, username, avatar_url))
`;

/** Columns selected for the match detail page - adds teams and richer profiles. */
const DETAIL_SELECT = `
  *,
  profiles:creator_id(id, username, avatar_url, full_name, account_type),
  venues(id, name, city, address, logo_url, phone),
  match_teams(id, match_id, side, name),
  match_participants(
    id, player_id, team_id, status, joined_at, extra_spots, extra_spots_opponent, rating_submitted,
    profiles(id, username, avatar_url, full_name)
  )
`;

export interface MatchListFilters {
  sport: SportType | 'all';
  showPast: boolean;
}

export interface NewMatch {
  creator_id: string;
  sport: SportType;
  title: string;
  description: string | null;
  location_name: string;
  scheduled_at: string;
  duration_minutes: number;
  max_players: number;
  team_size: number;
  min_rating: number;
  max_rating: number;
  is_private: boolean;
  invite_code: string | null;
}

export const createMatchService = (supabase: SupabaseClient) => ({
  list: async (filters: MatchListFilters): Promise<DataResult<Match[]>> => {
    const now = new Date().toISOString();
    let query = supabase.from('matches').select(FEED_SELECT);

    if (filters.showPast) {
      query = query.lt('scheduled_at', now).order('scheduled_at', { ascending: false });
    } else {
      query = query
        .in('status', [MatchStatus.Open, MatchStatus.Full])
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true });
    }

    if (filters.sport !== 'all') {
      query = query.eq('sport', filters.sport);
    }

    const { data, error } = await query;
    return { data: data ?? [], error };
  },

  getById: async (id: string): Promise<Match | null> => {
    const { data } = await supabase.from('matches').select(DETAIL_SELECT).eq('id', id).single();
    return data ?? null;
  },

  /**
   * Creates the match, its two teams, and the creator's participant row.
   *
   * These are separate statements, so a failure part-way through leaves a match
   * with no teams (MD-19/MD-20 track moving this into a single RPC). Doing it
   * here at least means there is one place to fix.
   *
   * Throws TimeoutError if any statement exceeds timeoutMs.
   */
  createWithTeams: async (match: NewMatch, timeoutMs = 15000): Promise<DataResult<Match>> => {
    const { data: created, error } = await withTimeout(
      supabase
        .from('matches')
        .insert({ ...match, status: MatchStatus.Open })
        .select()
        .single(),
      timeoutMs
    );

    if (error || !created) return { data: null, error };

    const { error: teamsError } = await withTimeout(
      supabase.from('match_teams').insert([
        { match_id: created.id, side: TeamSide.Home, name: 'Home' },
        { match_id: created.id, side: TeamSide.Away, name: 'Away' },
      ]),
      timeoutMs
    );
    if (teamsError) return { data: created, error: teamsError };

    const { data: teams } = await withTimeout(
      supabase.from('match_teams').select('id, side').eq('match_id', created.id),
      timeoutMs
    );

    const homeTeam = teams?.find((t: { side: TeamSide }) => t.side === TeamSide.Home);
    if (homeTeam) {
      await withTimeout(
        supabase.from('match_participants').insert({
          match_id: created.id,
          player_id: match.creator_id,
          team_id: homeTeam.id,
          status: ParticipantStatus.Confirmed,
        }),
        timeoutMs
      );
    }

    return { data: created, error: null };
  },

  updateStatus: async (matchId: string, status: MatchStatus): Promise<MutationResult> => {
    const { error } = await supabase.from('matches').update({ status }).eq('id', matchId);
    return { error };
  },

  notifyCompletion: async (matchId: string): Promise<void> => {
    await supabase.rpc('notify_match_completion', { p_match_id: matchId });
  },
});

export type MatchService = ReturnType<typeof createMatchService>;
