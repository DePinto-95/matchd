import { useState, useCallback, useEffect } from 'react';
import { MatchResult } from '@matchd/shared/types';
import { MatchWinnerSide, TeamSide } from '@matchd/shared/enums';
import { matchResultService, realtimeService } from '@/services';

/** Wraps a service call that returns the updated row, keeping local state in sync. */
type ResultAction = () => Promise<{ data: MatchResult | null; error: { message: string } | null }>;

export const useMatchResult = (matchId: string) => {
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchResult = useCallback(async () => {
    setLoading(true);
    const data = await matchResultService.getByMatch(matchId);
    setResult(data);
    setLoading(false);
    return data;
  }, [matchId]);

  // Refresh when the other team accepts, disputes, or rejects
  useEffect(
    () => realtimeService.subscribeToMatchResult(matchId, setResult),
    [matchId]
  );

  const run = async (action: ResultAction) => {
    setSubmitting(true);
    const { data, error } = await action();
    setSubmitting(false);
    if (error) return { ok: false, error: error.message };
    setResult(data);
    return { ok: true };
  };

  return {
    result,
    loading,
    submitting,
    fetchResult,

    submitResult: (
      submittedBy: string,
      submitterTeam: TeamSide,
      homeScore: number,
      awayScore: number,
      winnerSide: MatchWinnerSide
    ) =>
      run(() =>
        matchResultService.submit(
          matchId,
          submittedBy,
          submitterTeam,
          homeScore,
          awayScore,
          winnerSide
        )
      ),

    /** Team B accepts Team A's submission → CONFIRMED */
    acceptResult: (resultId: string) => run(() => matchResultService.confirm(resultId)),

    /** Team B rejects and submits a counter → DISPUTED */
    disputeResult: (
      resultId: string,
      counterBy: string,
      counterHome: number,
      counterAway: number,
      counterWinner: MatchWinnerSide
    ) =>
      run(() =>
        matchResultService.dispute(resultId, counterBy, counterHome, counterAway, counterWinner)
      ),

    /** Team A accepts the counter → CONFIRMED (counter values used by DB trigger) */
    acceptCounter: (resultId: string) => run(() => matchResultService.confirm(resultId)),

    /** Team A rejects the counter → ABANDONED (peer reviews only, no Elo) */
    rejectCounter: (resultId: string) => run(() => matchResultService.abandon(resultId)),
  };
};
