import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { MatchResult, MatchWinnerSide } from '@/types';

export const useMatchResult = (matchId: string) => {
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchResult = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('match_results')
      .select('*')
      .eq('match_id', matchId)
      .maybeSingle();
    setResult(data ?? null);
    setLoading(false);
    return data as MatchResult | null;
  }, [matchId]);

  // Realtime: refresh when the other team accepts, disputes, or rejects
  useEffect(() => {
    const channel = supabase
      .channel(`match_result:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'match_results',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => setResult(payload.new as MatchResult),
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_results',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => setResult(payload.new as MatchResult),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  const submitResult = async (
    submittedBy: string,
    submitterTeam: 'home' | 'away',
    homeScore: number,
    awayScore: number,
    winnerSide: MatchWinnerSide,
  ) => {
    setSubmitting(true);
    const { data, error } = await supabase
      .from('match_results')
      .insert({
        match_id: matchId,
        submitted_by: submittedBy,
        submitter_team: submitterTeam,
        home_score: homeScore,
        away_score: awayScore,
        winner_side: winnerSide,
        status: 'submitted',
      })
      .select()
      .single();
    setSubmitting(false);
    if (error) return { ok: false, error: error.message };
    setResult(data as MatchResult);
    return { ok: true };
  };

  // Team B accepts Team A's submission → CONFIRMED
  const acceptResult = async (resultId: string) => {
    setSubmitting(true);
    const { data, error } = await supabase
      .from('match_results')
      .update({ status: 'confirmed' })
      .eq('id', resultId)
      .select()
      .single();
    setSubmitting(false);
    if (error) return { ok: false, error: error.message };
    setResult(data as MatchResult);
    return { ok: true };
  };

  // Team B rejects and submits counter → DISPUTED
  const disputeResult = async (
    resultId: string,
    counterBy: string,
    counterHome: number,
    counterAway: number,
    counterWinner: MatchWinnerSide,
  ) => {
    setSubmitting(true);
    const { data, error } = await supabase
      .from('match_results')
      .update({
        status: 'disputed',
        counter_submitted_by: counterBy,
        counter_home_score: counterHome,
        counter_away_score: counterAway,
        counter_winner_side: counterWinner,
      })
      .eq('id', resultId)
      .select()
      .single();
    setSubmitting(false);
    if (error) return { ok: false, error: error.message };
    setResult(data as MatchResult);
    return { ok: true };
  };

  // Team A accepts counter → CONFIRMED (counter values used by DB trigger)
  const acceptCounter = async (resultId: string) => {
    setSubmitting(true);
    const { data, error } = await supabase
      .from('match_results')
      .update({ status: 'confirmed' })
      .eq('id', resultId)
      .select()
      .single();
    setSubmitting(false);
    if (error) return { ok: false, error: error.message };
    setResult(data as MatchResult);
    return { ok: true };
  };

  // Team A rejects counter → ABANDONED (peer reviews only, no Elo)
  const rejectCounter = async (resultId: string) => {
    setSubmitting(true);
    const { data, error } = await supabase
      .from('match_results')
      .update({ status: 'abandoned' })
      .eq('id', resultId)
      .select()
      .single();
    setSubmitting(false);
    if (error) return { ok: false, error: error.message };
    setResult(data as MatchResult);
    return { ok: true };
  };

  return {
    result,
    loading,
    submitting,
    fetchResult,
    submitResult,
    acceptResult,
    disputeResult,
    acceptCounter,
    rejectCounter,
  };
};
