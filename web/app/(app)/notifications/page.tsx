'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Users, Share2, Star, X, Trophy } from 'lucide-react';
import { SPORTS } from '@/constants/sports';
import type { SportType } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Button } from '@/components/ui/Button';

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { notifications, unreadCount, loading, fetchNotifications, markAsRead, deleteNotification, markAllAsRead } = useNotificationStore();

  useEffect(() => {
    if (user?.id) fetchNotifications(user.id);
  }, [user?.id, fetchNotifications]);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-text-muted text-sm mt-1">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => user?.id && markAllAsRead(user.id)}
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Bell className="w-12 h-12 text-border mb-4" />
          <h2 className="font-heading font-bold text-lg text-text mb-2">No notifications</h2>
          <p className="text-text-muted text-sm">You're all caught up!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => {
            const isFriendType = n.type === 'friend_request' || n.type === 'friend_accepted';
            const isMatchInvite = n.type === 'match_invite';
            const isRatePlayers = n.type === 'rate_players';
            const isMatchCompleted = n.type === 'match_completed';
            const sport = (isMatchInvite || isRatePlayers || isMatchCompleted) ? (n.data as { sport?: SportType })?.sport : undefined;
            const matchEmoji = sport ? (SPORTS[sport]?.emoji ?? '🏅') : null;

            return (
              <div key={n.id} className="relative group">
                <button
                  onClick={async () => {
                    if (!n.read) await markAsRead(n.id);
                    if (isRatePlayers) {
                      const matchId = (n.data as { match_id?: string })?.match_id;
                      if (matchId) router.push(`/matches/${matchId}/rate`);
                    } else if (isMatchCompleted) {
                      const matchId = (n.data as { match_id?: string })?.match_id;
                      if (matchId) router.push(`/matches/${matchId}`);
                    } else if (isMatchInvite) {
                      const matchId = (n.data as { match_id?: string })?.match_id;
                      if (matchId) router.push(`/matches/${matchId}`);
                    } else if (isFriendType) {
                      router.push('/friends');
                    }
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all
                    ${n.read
                      ? 'bg-surface border-border'
                      : 'bg-brand/5 border-brand/30 hover:bg-brand/10'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    {!n.read && <div className="w-2 h-2 rounded-full bg-brand mt-1.5 flex-shrink-0" />}
                    <div className={`flex items-start gap-2 flex-1 ${n.read ? 'pl-5' : ''}`}>
                      {isFriendType && <Users className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />}
                      {isRatePlayers && <Star className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />}
                      {isMatchCompleted && <Trophy className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />}
                      {isMatchInvite && <span className="text-base leading-none flex-shrink-0">{matchEmoji ?? <Share2 className="w-4 h-4" />}</span>}
                      <div className="flex-1 pr-6">
                        <p className="text-sm font-medium text-text">{n.title}</p>
                        {n.body && <p className="text-xs text-text-muted mt-0.5">{n.body}</p>}
                        <p className="text-xs text-text-muted mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => deleteNotification(n.id)}
                  className="absolute top-2 right-2 p-1 rounded-md text-text-muted opacity-0 group-hover:opacity-100 hover:text-text hover:bg-surface-alt transition-all"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
