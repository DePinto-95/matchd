import type { SupabaseClient } from '@supabase/supabase-js';
import { ParticipantStatus } from '../enums';
import { Match } from '../types';
import { MutationResult } from './types';

export interface JoinArgs {
  matchId: string;
  playerId: string;
  teamId: string | null;
  /** Spots held on the player's own team, on top of their own place. */
  extraSpots: number;
  /** Spots held on the opposing team. */
  extraSpotsOpponent?: number;
}

type CountableMatch = Pick<Match, 'sport' | 'scheduled_at' | 'duration_minutes' | 'status'>;

export const createParticipantService = (supabase: SupabaseClient) => ({
  /**
   * Inserts the participant row, then holds any extra spots.
   *
   * The DB trigger already counts the row itself, so the RPC only ever carries
   * the extra reserved spots.
   */
  join: async ({
    matchId,
    playerId,
    teamId,
    extraSpots,
    extraSpotsOpponent = 0,
  }: JoinArgs): Promise<MutationResult> => {
    const { error } = await supabase.from('match_participants').insert({
      match_id: matchId,
      player_id: playerId,
      team_id: teamId,
      status: ParticipantStatus.Confirmed,
      extra_spots: extraSpots,
      extra_spots_opponent: extraSpotsOpponent,
    });
    if (error) return { error };

    const held = extraSpots + extraSpotsOpponent;
    if (held > 0) {
      await supabase.rpc('adjust_match_player_count', { p_match_id: matchId, p_delta: held });
    }
    return { error: null };
  },

  /**
   * Deletes the participant row and releases every spot they were holding.
   * The trigger subtracts 1 for the DELETE; heldSpots covers both sides.
   */
  leave: async (matchId: string, playerId: string, heldSpots: number): Promise<MutationResult> => {
    const { error } = await supabase
      .from('match_participants')
      .delete()
      .eq('match_id', matchId)
      .eq('player_id', playerId);
    if (error) return { error };

    if (heldSpots > 0) {
      await supabase.rpc('adjust_match_player_count', {
        p_match_id: matchId,
        p_delta: -heldSpots,
      });
    }
    return { error: null };
  },

  /** Changes how many spots a participant holds, adjusting the count by the delta. */
  updateHeldSpots: async (
    matchId: string,
    playerId: string,
    extraSpots: number,
    extraSpotsOpponent: number,
    countDelta: number
  ): Promise<MutationResult> => {
    const { error } = await supabase
      .from('match_participants')
      .update({ extra_spots: extraSpots, extra_spots_opponent: extraSpotsOpponent })
      .eq('match_id', matchId)
      .eq('player_id', playerId);
    if (error) return { error };

    if (countDelta !== 0) {
      await supabase.rpc('adjust_match_player_count', {
        p_match_id: matchId,
        p_delta: countDelta,
      });
    }
    return { error: null };
  },

  markRatingSubmitted: async (matchId: string, playerId: string): Promise<MutationResult> => {
    const { error } = await supabase
      .from('match_participants')
      .update({ rating_submitted: true })
      .eq('match_id', matchId)
      .eq('player_id', playerId);
    return { error };
  },

  /** Most recent matches a player took part in, for the profile history list. */
  listMatchHistory: async (playerId: string): Promise<Match[]> => {
    const { data } = await supabase
      .from('match_participants')
      .select('matches(*)')
      .eq('player_id', playerId)
      .order('joined_at', { ascending: false })
      .limit(20);
    // Supabase types an embedded relation as an array; `matches` is to-one, so
    // at runtime this is a single object (or null).
    return ((data ?? []) as unknown as { matches: Match | null }[])
      .map((row) => row.matches)
      .filter((m): m is Match => Boolean(m));
  },

  /** Minimal match rows for counting matches actually played per sport. */
  listConfirmedForCounting: async (playerId: string): Promise<CountableMatch[]> => {
    const { data } = await supabase
      .from('match_participants')
      .select('matches(sport, scheduled_at, duration_minutes, status)')
      .eq('player_id', playerId)
      .eq('status', ParticipantStatus.Confirmed);
    return ((data ?? []) as unknown as { matches: CountableMatch | null }[])
      .map((row) => row.matches)
      .filter((m): m is CountableMatch => Boolean(m));
  },
});

export type ParticipantService = ReturnType<typeof createParticipantService>;
