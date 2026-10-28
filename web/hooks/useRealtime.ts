import { useEffect } from 'react';
import { realtimeService } from '@/services';

export const useMatchRealtime = (matchId: string, onUpdate: () => void) => {
  useEffect(() => realtimeService.subscribeToMatch(matchId, onUpdate), [matchId, onUpdate]);
};

/**
 * Only call this once per session — it lives in the Navbar. Calling it from a
 * page as well makes Supabase throw a duplicate-channel error.
 */
export const useNotificationRealtime = (userId: string, onNew: () => void) => {
  useEffect(() => {
    if (!userId) return;
    return realtimeService.subscribeToNotifications(userId, onNew);
  }, [userId, onNew]);
};
