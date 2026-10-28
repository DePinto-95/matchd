import type { SupabaseClient } from '@supabase/supabase-js';
import { MatchResultStatus, MatchWinnerSide, TeamSide } from '../enums';
import { MatchResult } from '../types';
import { DataResult } from './types';

export const createMatchResultService = (supabase: SupabaseClient) => ({
  getByMatch: async (matchId: string): Promise<MatchResult | null> => {
    const { data } = await supabase
      .from('match_results')
      .select('*')
      .eq('match_id', matchId)
      .maybeSingle();
    return (data as MatchResult) ?? null;
  },

  submit: async (
    matchId: string,
    submittedBy: string,
    submitterTeam: TeamSide,
    homeScore: number,
    awayScore: number,
    winnerSide: MatchWinnerSide
  ): Promise<DataResult<MatchResult>> => {
    const { data, error } = await supabase
      .from('match_results')
      .insert({
        match_id: matchId,
        submitted_by: submittedBy,
        submitter_team: submitterTeam,
        home_score: homeScore,
        away_score: awayScore,
        winner_side: winnerSide,
        status: MatchResultStatus.Submitted,
      })
      .select()
      .single();
    return { data: (data as MatchResult) ?? null, error };
  },

  /** Team B accepts Team A's submission, or Team A accepts the counter. */
  confirm: async (resultId: string): Promise<DataResult<MatchResult>> => {
    const { data, error } = await supabase
      .from('match_results')
      .update({ status: MatchResultStatus.Confirmed })
      .eq('id', resultId)
      .select()
      .single();
    return { data: (data as MatchResult) ?? null, error };
  },

  /** Team B rejects and submits a counter score. */
  dispute: async (
    resultId: string,
    counterBy: string,
    counterHome: number,
    counterAway: number,
    counterWinner: MatchWinnerSide
  ): Promise<DataResult<MatchResult>> => {
    const { data, error } = await supabase
      .from('match_results')
      .update({
        status: MatchResultStatus.Disputed,
        counter_submitted_by: counterBy,
        counter_home_score: counterHome,
        counter_away_score: counterAway,
        counter_winner_side: counterWinner,
      })
      .eq('id', resultId)
      .select()
      .single();
    return { data: (data as MatchResult) ?? null, error };
  },

  /** Team A rejects the counter: peer reviews still count, Elo does not apply. */
  abandon: async (resultId: string): Promise<DataResult<MatchResult>> => {
    const { data, error } = await supabase
      .from('match_results')
      .update({ status: MatchResultStatus.Abandoned })
      .eq('id', resultId)
      .select()
      .single();
    return { data: (data as MatchResult) ?? null, error };
  },
});

export type MatchResultService = ReturnType<typeof createMatchResultService>;
