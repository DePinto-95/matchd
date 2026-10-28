import { useState, useCallback } from 'react';
import { isMatchPast } from '@matchd/shared/lib/helpers';
import { Profile, PlayerRating, Match } from '@matchd/shared/types';
import { MatchStatus } from '@matchd/shared/enums';
import { participantService, profileService, ratingService } from '@/services';

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [matchHistory, setMatchHistory] = useState<Match[]>([]);
  // matches actually played per sport (past, non-cancelled, confirmed participation) —
  // drives the rating-unlock gate, independent of whether a result was confirmed
  const [playedCounts, setPlayedCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async (id: string) => {
    setLoading(true);
    const [profileRow, ratingRows, history, played] = await Promise.all([
      profileService.getById(id),
      ratingService.listForPlayer(id),
      participantService.listMatchHistory(id),
      participantService.listConfirmedForCounting(id),
    ]);

    setProfile(profileRow);
    setRatings(ratingRows);
    setMatchHistory(history);

    // Count matches played per sport: must be in the past and not cancelled
    const counts: Record<string, number> = {};
    for (const m of played) {
      if (m.status === MatchStatus.Cancelled) continue;
      if (!isMatchPast(m.scheduled_at, m.duration_minutes)) continue;
      counts[m.sport] = (counts[m.sport] ?? 0) + 1;
    }
    setPlayedCounts(counts);

    setLoading(false);
  }, []);

  return { profile, ratings, matchHistory, playedCounts, loading, fetchProfile };
};
