import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Notification } from '../types';
import { createNotificationService } from '../services';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  clearAll: (userId: string) => Promise<void>;
  clearRead: (userId: string) => Promise<void>;
}

export const createNotificationStore = (supabase: SupabaseClient) => {
  const notifications = createNotificationService(supabase);

  return create<NotificationState>((set) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,

    fetchNotifications: async (userId: string) => {
      set({ loading: true });
      const rows = await notifications.list(userId);
      set({
        notifications: rows,
        unreadCount: rows.filter((n) => !n.read).length,
        loading: false,
      });
    },

    markAsRead: async (id: string) => {
      const { error } = await notifications.setRead(id, true);
      if (error) return;
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    },

    markAsUnread: async (id: string) => {
      const { error } = await notifications.setRead(id, false);
      if (error) return;
      set((state) => {
        const target = state.notifications.find((n) => n.id === id);
        if (!target || !target.read) return state;
        return {
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: false } : n
          ),
          unreadCount: state.unreadCount + 1,
        };
      });
    },

    deleteNotification: async (id: string) => {
      const { error } = await notifications.remove(id);
      if (error) return;
      set((state) => {
        const removed = state.notifications.find((n) => n.id === id);
        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount:
            removed && !removed.read
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
        };
      });
    },

    markAllAsRead: async (userId: string) => {
      // MD-19: the error is deliberately ignored here to preserve existing
      // behaviour — local state is updated even if the DB update failed.
      await notifications.markAllRead(userId);
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    },

    clearAll: async (userId: string) => {
      const { error } = await notifications.clearAll(userId);
      if (error) return;
      set({ notifications: [], unreadCount: 0 });
    },

    clearRead: async (userId: string) => {
      const { error } = await notifications.clearRead(userId);
      if (error) return;
      set((state) => ({
        notifications: state.notifications.filter((n) => !n.read),
      }));
    },
  }));
};
