import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

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
    const { error } = await supabase.from('match_ratings').upsert({
      match_id: matchId,
      rater_id: raterId,
      rated_player_id: ratedPlayerId,
      sport,
      score,
      comment: comment ?? null,
    }, { onConflict: 'match_id,rater_id,rated_player_id' });
    if (error?.code || error?.message) {
      console.error('match_ratings insert failed:', error.message, error.code);
    } else {
      setSubmitted((prev) => [...prev, ratedPlayerId]);
    }
    setSubmitting(false);
    return !(error?.code || error?.message);
  };

  const hasRated = (playerId: string) => submitted.includes(playerId);

  return { submitRating, submitting, hasRated };
};
