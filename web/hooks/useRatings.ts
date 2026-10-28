import { useState } from 'react';
import { SportType } from '@matchd/shared/enums';
import { ratingService } from '@/services';

/** `sport` is undefined until the match has loaded; submitting is a no-op until then. */
export const useRatings = (matchId: string, sport: SportType | undefined) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string[]>([]);

  const submitRating = async (
    raterId: string,
    ratedPlayerId: string,
    score: number,
    comment?: string
  ) => {
    if (!sport) return false;
    setSubmitting(true);
    const { error } = await ratingService.submitScore(
      matchId,
      raterId,
      ratedPlayerId,
      sport,
      score,
      comment
    );
    if (error) {
      console.error('match_ratings insert failed:', error.message, error.code);
    } else {
      setSubmitted((prev) => [...prev, ratedPlayerId]);
    }
    setSubmitting(false);
    return !error;
  };

  const hasRated = (playerId: string) => submitted.includes(playerId);

  return { submitRating, submitting, hasRated };
};
