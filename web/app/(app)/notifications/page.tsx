'use client';

import { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { NotificationBulkActions, NotificationRow } from '@/features/notifications/components';
import { EmptyState, SkeletonRows } from '@/features/friends/components';

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAsUnread,
    deleteNotification,
    markAllAsRead,
    clearAll,
    clearRead,
  } = useNotificationStore();

  const readCount = notifications.length - unreadCount;

  // Fetch on mount only - the Navbar owns the realtime subscription.
  useEffect(() => {
    if (user?.id) fetchNotifications(user.id);
  }, [user?.id, fetchNotifications]);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text">Notifications</h1>
          {unreadCount > 0 && <p className="text-text-muted text-sm mt-1">{unreadCount} unread</p>}
        </div>
        {notifications.length > 0 && user?.id && (
          <NotificationBulkActions
            unreadCount={unreadCount}
            readCount={readCount}
            onMarkAllRead={() => markAllAsRead(user.id)}
            onClearRead={() => clearRead(user.id)}
            onClearAll={() => clearAll(user.id)}
          />
        )}
      </div>

      {loading ? (
        <SkeletonRows count={5} height="h-16" />
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" message="You're all caught up!" />
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onRead={markAsRead}
              onUnread={markAsUnread}
              onDelete={deleteNotification}
            />
          ))}
        </div>
      )}
    </div>
  );
}
