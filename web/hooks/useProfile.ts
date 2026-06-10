import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { isMatchPast } from '@/lib/helpers';
import { Profile, PlayerRating, Match } from '@/types';

export const useProfile = (userId?: string) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [matchHistory, setMatchHistory] = useState<Match[]>([]);
  // matches actually played per sport (past, non-cancelled, confirmed participation) —
  // drives the rating-unlock gate, independent of whether a result was confirmed
  const [playedCounts, setPlayedCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async (id: string) => {
    setLoading(true);
    const [profileRes, ratingsRes, historyRes, playedRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('player_ratings').select('*').eq('player_id', id),
      supabase
        .from('match_participants')
        .select('matches(*)')
        .eq('player_id', id)
        .order('joined_at', { ascending: false })
        .limit(20),
      supabase
        .from('match_participants')
        .select('matches(sport, scheduled_at, duration_minutes, status)')
        .eq('player_id', id)
        .eq('status', 'confirmed'),
    ]);
    setProfile(profileRes.data ?? null);
    setRatings(ratingsRes.data ?? []);
    const history = (historyRes.data ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => p.matches)
      .filter(Boolean) as Match[];
    setMatchHistory(history);

    // Count matches played per sport: must be in the past and not cancelled
    const counts: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (playedRes.data ?? []) as any[]) {
      const m = row.matches;
      if (!m || m.status === 'cancelled') continue;
      if (!isMatchPast(m.scheduled_at, m.duration_minutes)) continue;
      counts[m.sport] = (counts[m.sport] ?? 0) + 1;
    }
    setPlayedCounts(counts);

    setLoading(false);
  }, []);

  return { profile, ratings, matchHistory, playedCounts, loading, fetchProfile };
};
