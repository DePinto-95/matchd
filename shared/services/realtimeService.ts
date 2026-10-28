import type { SupabaseClient } from '@supabase/supabase-js';
import { MatchResult } from '../types';

/** Every subscribe returns its own teardown, so callers never touch channels. */
type Unsubscribe = () => void;

export const createRealtimeService = (supabase: SupabaseClient) => ({
  /** Participant joins/leaves and match updates for one match. */
  subscribeToMatch: (matchId: string, onChange: () => void): Unsubscribe => {
    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_participants',
          filter: `match_id=eq.${matchId}`,
        },
        onChange
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        onChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * New notifications for one user.
   *
   * Subscribe to this ONCE per session - the Navbar owns it. Subscribing again
   * from a page makes Supabase throw a duplicate-channel error.
   */
  subscribeToNotifications: (userId: string, onInsert: () => void): Unsubscribe => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        onInsert
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /** Result submitted, accepted, disputed or rejected by the other team. */
  subscribeToMatchResult: (
    matchId: string,
    onChange: (result: MatchResult) => void
  ): Unsubscribe => {
    const filter = `match_id=eq.${matchId}`;
    const channel = supabase
      .channel(`match_result:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'match_results', filter },
        (payload) => onChange(payload.new as MatchResult)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_results', filter },
        (payload) => onChange(payload.new as MatchResult)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
});

export type RealtimeService = ReturnType<typeof createRealtimeService>;
