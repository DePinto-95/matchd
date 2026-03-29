import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MatchParticipant } from '@/types';

export const useRatings = (matchId: string, sport: string) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string[]>([]);

  const submitRating = async (
    raterId: string,
    ratedPlayerId: string,
    score: number,
    comment?: string
  ) => {
    setSubmitting(true);
    const { error } = await supabase.from('match_ratings').insert({
      match_id: matchId,
      rater_id: raterId,
      rated_player_id: ratedPlayerId,
      sport,
      score,
      comment: comment ?? null,
    });
    if (!error) {
      setSubmitted((prev) => [...prev, ratedPlayerId]);
    }
    setSubmitting(false);
    return !error;
  };

  const hasRated = (playerId: string) => submitted.includes(playerId);

  return { submitRating, submitting, hasRated };
};
