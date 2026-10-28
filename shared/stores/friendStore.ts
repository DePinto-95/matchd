import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FriendRelationKind, NotificationType, ReportReason, SportType } from '../enums';
import { Friendship, FriendRelation } from '../types';
import {
  DUPLICATE_REPORT_CODE,
  createFriendService,
  createNotificationService,
  createReportService,
} from '../services';

interface FriendStore {
  friends: Friendship[];
  pendingIn: Friendship[];
  pendingOut: Friendship[];
  pendingInCount: number;
  loading: boolean;

  getRelation: (otherUserId: string) => FriendRelation;
  fetchFriends: (userId: string) => Promise<void>;
  sendRequest: (currentUserId: string, targetId: string, senderUsername: string) => Promise<void>;
  cancelRequest: (friendshipId: string) => Promise<void>;
  acceptRequest: (friendshipId: string, acceptorUsername: string) => Promise<void>;
  declineRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  sendMatchInvites: (
    senderUsername: string,
    friendIds: string[],
    match: { id: string; sport: SportType; title: string; invite_code?: string | null }
  ) => Promise<void>;
  reportUser: (
    reporterId: string,
    reportedId: string,
    reason: ReportReason,
    details?: string
  ) => Promise<void>;
}

export interface FriendStoreOptions {
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

export const createFriendStore = (
  supabase: SupabaseClient,
  options: FriendStoreOptions = {}
) => {
  const friendsApi = createFriendService(supabase);
  const notifications = createNotificationService(supabase);
  const reports = createReportService(supabase);
  const fail = (message: string) => options.onError?.(message);
  const done = (message: string) => options.onSuccess?.(message);

  return create<FriendStore>((set, get) => ({
    friends: [],
    pendingIn: [],
    pendingOut: [],
    pendingInCount: 0,
    loading: false,

    getRelation: (otherUserId) => {
      const { pendingOut, pendingIn, friends } = get();
      const out = pendingOut.find((f) => f.addressee_id === otherUserId);
      if (out) return { kind: FriendRelationKind.PendingSent, friendshipId: out.id };
      const incoming = pendingIn.find((f) => f.requester_id === otherUserId);
      if (incoming) return { kind: FriendRelationKind.PendingReceived, friendshipId: incoming.id };
      const friend = friends.find(
        (f) => f.requester_id === otherUserId || f.addressee_id === otherUserId
      );
      if (friend) return { kind: FriendRelationKind.Friends, friendshipId: friend.id };
      return { kind: FriendRelationKind.None };
    },

    fetchFriends: async (userId) => {
      set({ loading: true });
      const { friends, pendingIn, pendingOut } = await friendsApi.listAll(userId);
      set({
        friends,
        pendingIn,
        pendingOut,
        pendingInCount: pendingIn.length,
        loading: false,
      });
    },

    sendRequest: async (currentUserId, targetId, senderUsername) => {
      const { data, error } = await friendsApi.sendRequest(currentUserId, targetId);
      if (error || !data) { fail(error?.message ?? 'Could not send request.'); return; }

      await notifications.create({
        user_id: targetId,
        type: NotificationType.FriendRequest,
        title: `${senderUsername} sent you a friend request`,
        data: { friendship_id: data.id, sender_id: currentUserId },
      });

      set((s) => ({ pendingOut: [...s.pendingOut, data] }));
      done('Friend request sent!');
    },

    cancelRequest: async (friendshipId) => {
      const { error } = await friendsApi.remove(friendshipId);
      if (error) { fail(error.message); return; }
      set((s) => ({ pendingOut: s.pendingOut.filter((f) => f.id !== friendshipId) }));
    },

    acceptRequest: async (friendshipId, acceptorUsername) => {
      const { data, error } = await friendsApi.accept(friendshipId);
      if (error || !data) { fail(error?.message ?? 'Could not accept request.'); return; }

      await notifications.create({
        user_id: data.requester_id,
        type: NotificationType.FriendAccepted,
        title: `${acceptorUsername} accepted your friend request`,
        data: { friendship_id: friendshipId },
      });

      set((s) => {
        const accepted = s.pendingIn.find((f) => f.id === friendshipId);
        return {
          pendingIn: s.pendingIn.filter((f) => f.id !== friendshipId),
          pendingInCount: Math.max(0, s.pendingInCount - 1),
          friends: accepted ? [...s.friends, { ...accepted, status: data.status }] : s.friends,
        };
      });
      done('Friend request accepted!');
    },

    declineRequest: async (friendshipId) => {
      const { error } = await friendsApi.remove(friendshipId);
      if (error) { fail(error.message); return; }
      set((s) => ({
        pendingIn: s.pendingIn.filter((f) => f.id !== friendshipId),
        pendingInCount: Math.max(0, s.pendingInCount - 1),
      }));
    },

    removeFriend: async (friendshipId) => {
      const { error } = await friendsApi.remove(friendshipId);
      if (error) { fail(error.message); return; }
      set((s) => ({ friends: s.friends.filter((f) => f.id !== friendshipId) }));
      done('Friend removed.');
    },

    sendMatchInvites: async (senderUsername, friendIds, match) => {
      const { error } = await notifications.create(
        friendIds.map((fid) => ({
          user_id: fid,
          type: NotificationType.MatchInvite,
          title: `${senderUsername} invited you to a match`,
          body: match.title,
          data: {
            match_id: match.id,
            sport: match.sport,
            title: match.title,
            invite_code: match.invite_code ?? undefined,
          },
        }))
      );
      if (error) { fail(error.message); return; }
      done(`Invitation${friendIds.length > 1 ? 's' : ''} sent!`);
    },

    reportUser: async (reporterId, reportedId, reason, details) => {
      const { error } = await reports.create(reporterId, reportedId, reason, details);
      if (error?.code === DUPLICATE_REPORT_CODE) {
        fail("You've already reported this user.");
        return;
      }
      if (error) { fail(error.message); return; }
      done('Report submitted. Thank you.');
    },
  }));
};
