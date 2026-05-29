'use client';

import { useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useNotificationRealtime } from '@/hooks/useRealtime';
import { Button } from '@/components/ui/Button';

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();

  useEffect(() => {
    if (user?.id) fetchNotifications(user.id);
  }, [user?.id, fetchNotifications]);

  useNotificationRealtime(user?.id ?? '', () => {
    if (user?.id) fetchNotifications(user.id);
  });

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
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read && markAsRead(n.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all
                ${n.read
                  ? 'bg-surface border-border'
                  : 'bg-brand/5 border-brand/30 hover:bg-brand/10'
                }`}
            >
              <div className="flex items-start gap-3">
                {!n.read && <div className="w-2 h-2 rounded-full bg-brand mt-1.5 flex-shrink-0" />}
                <div className={`flex-1 ${n.read ? 'pl-5' : ''}`}>
                  <p className="text-sm font-medium text-text">{n.title}</p>
                  {n.body && <p className="text-xs text-text-muted mt-0.5">{n.body}</p>}
                  <p className="text-xs text-text-muted mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
