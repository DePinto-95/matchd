import type { SupabaseClient } from '@supabase/supabase-js';
import { NotificationType } from '../enums';
import { Notification } from '../types';
import { MutationResult } from './types';

export interface NewNotification {
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
}

export const createNotificationService = (supabase: SupabaseClient) => ({
  list: async (userId: string): Promise<Notification[]> => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    return data ?? [];
  },

  /**
   * Sends one or more notifications. Any authenticated user may insert, which is
   * what makes friend requests and match invites possible.
   */
  create: async (rows: NewNotification | NewNotification[]): Promise<MutationResult> => {
    const list = (Array.isArray(rows) ? rows : [rows]).map((row) => ({
      body: null,
      data: null,
      ...row,
      read: false,
    }));
    const { error } = await supabase.from('notifications').insert(list);
    return { error };
  },

  setRead: async (id: string, read: boolean): Promise<MutationResult> => {
    const { error } = await supabase.from('notifications').update({ read }).eq('id', id);
    return { error };
  },

  remove: async (id: string): Promise<MutationResult> => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    return { error };
  },

  markAllRead: async (userId: string): Promise<MutationResult> => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    return { error };
  },

  clearAll: async (userId: string): Promise<MutationResult> => {
    const { error } = await supabase.from('notifications').delete().eq('user_id', userId);
    return { error };
  },

  clearRead: async (userId: string): Promise<MutationResult> => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('read', true);
    return { error };
  },
});

export type NotificationService = ReturnType<typeof createNotificationService>;
