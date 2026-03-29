import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile, PlayerRating, Match } from '@/types';

export const useProfile = (userId?: string) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [matchHistory, setMatchHistory] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async (id: string) => {
    setLoading(true);
    const [profileRes, ratingsRes, historyRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('player_ratings').select('*').eq('player_id', id),
      supabase
        .from('match_participants')
        .select('matches(*)')
        .eq('player_id', id)
        .order('joined_at', { ascending: false })
        .limit(20),
    ]);
    setProfile(profileRes.data ?? null);
    setRatings(ratingsRes.data ?? []);
    const history = (historyRes.data ?? [])
      .map((p: any) => p.matches)
      .filter(Boolean) as Match[];
    setMatchHistory(history);
    setLoading(false);
  }, []);

  return { profile, ratings, matchHistory, loading, fetchProfile };
};
