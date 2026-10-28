import type { SupabaseClient } from '@supabase/supabase-js';
import { SportType } from '../enums';
import { PlayerRating } from '../types';
import { MutationResult } from './types';

/** Rating a brand-new player starts on. Mirrors the SQL default in rating_migration.sql. */
export const DEFAULT_RATING = 2.0;

export const createRatingService = (supabase: SupabaseClient) => ({
  listForPlayer: async (playerId: string): Promise<PlayerRating[]> => {
    const { data } = await supabase.from('player_ratings').select('*').eq('player_id', playerId);
    return data ?? [];
  },

  /** The rating used to gate joining a match. Falls back to DEFAULT_RATING. */
  getForSport: async (playerId: string, sport: SportType): Promise<number> => {
    const { data } = await supabase
      .from('player_ratings')
      .select('rating')
      .eq('player_id', playerId)
      .eq('sport', sport)
      .single();
    return data?.rating ?? DEFAULT_RATING;
  },

  /** Scores this rater has already submitted for a match, so the form can resume. */
  listSubmittedScores: async (
    matchId: string,
    raterId: string
  ): Promise<{ rated_player_id: string; score: number }[]> => {
    const { data } = await supabase
      .from('match_ratings')
      .select('rated_player_id, score')
      .eq('match_id', matchId)
      .eq('rater_id', raterId);
    return data ?? [];
  },

  /** Upsert so a rater can change a score before the review window closes. */
  submitScore: async (
    matchId: string,
    raterId: string,
    ratedPlayerId: string,
    sport: SportType,
    score: number,
    comment?: string
  ): Promise<MutationResult> => {
    const { error } = await supabase.from('match_ratings').upsert(
      {
        match_id: matchId,
        rater_id: raterId,
        rated_player_id: ratedPlayerId,
        sport,
        score,
        comment: comment ?? null,
      },
      { onConflict: 'match_id,rater_id,rated_player_id' }
    );
    return { error };
  },
});

export type RatingService = ReturnType<typeof createRatingService>;
