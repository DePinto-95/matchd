import { create } from 'zustand';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import type { Friendship, FriendRelation, ReportReason, Profile } from '@/types';

type AcceptedRow = Omit<Friendship, 'profiles'> & {
  requester: Profile;
  addressee: Profile;
};

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
    match: { id: string; sport: string; title: string }
  ) => Promise<void>;
  reportUser: (reporterId: string, reportedId: string, reason: ReportReason, details?: string) => Promise<void>;
}

export const useFriendStore = create<FriendStore>((set, get) => ({
  friends: [],
  pendingIn: [],
  pendingOut: [],
  pendingInCount: 0,
  loading: false,

  getRelation: (otherUserId) => {
    const { pendingOut, pendingIn, friends } = get();
    const out = pendingOut.find(f => f.addressee_id === otherUserId);
    if (out) return { kind: 'pending_sent', friendshipId: out.id };
    const incoming = pendingIn.find(f => f.requester_id === otherUserId);
    if (incoming) return { kind: 'pending_received', friendshipId: incoming.id };
    const friend = friends.find(f => f.requester_id === otherUserId || f.addressee_id === otherUserId);
    if (friend) return { kind: 'friends', friendshipId: friend.id };
    return { kind: 'none' };
  },

  fetchFriends: async (userId) => {
    set({ loading: true });
    const [acceptedRes, incomingRes, outgoingRes] = await Promise.all([
      supabase
        .from('friendships')
        .select('*, requester:requester_id(*), addressee:addressee_id(*)')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq('status', 'accepted'),
      supabase
        .from('friendships')
        .select('*, profiles:requester_id(*)')
        .eq('addressee_id', userId)
        .eq('status', 'pending'),
      supabase
        .from('friendships')
        .select('*, profiles:addressee_id(*)')
        .eq('requester_id', userId)
        .eq('status', 'pending'),
    ]);

    const accepted = ((acceptedRes.data ?? []) as unknown as AcceptedRow[]).map(f => ({
      ...f,
      profiles: f.requester_id === userId ? f.addressee : f.requester,
    }));

    const pendingIn = (incomingRes.data ?? []) as unknown as Friendship[];
    const pendingOut = (outgoingRes.data ?? []) as unknown as Friendship[];

    set({
      friends: accepted,
      pendingIn,
      pendingOut,
      pendingInCount: pendingIn.length,
      loading: false,
    });
  },

  sendRequest: async (currentUserId, targetId, senderUsername) => {
    const { data, error } = await supabase
      .from('friendships')
      .insert({ requester_id: currentUserId, addressee_id: targetId, status: 'pending' })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }

    await supabase.from('notifications').insert({
      user_id: targetId,
      type: 'friend_request',
      title: `${senderUsername} sent you a friend request`,
      body: null,
      data: { friendship_id: data.id, sender_id: currentUserId },
      read: false,
    });

    set(s => ({ pendingOut: [...s.pendingOut, data as Friendship] }));
    toast.success('Friend request sent!');
  },

  cancelRequest: async (friendshipId) => {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
    if (error) { toast.error(error.message); return; }
    set(s => ({ pendingOut: s.pendingOut.filter(f => f.id !== friendshipId) }));
  },

  acceptRequest: async (friendshipId, acceptorUsername) => {
    const { data, error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
      .select()
      .single();
    if (error) { toast.error(error.message); return; }

    await supabase.from('notifications').insert({
      user_id: data.requester_id,
      type: 'friend_accepted',
      title: `${acceptorUsername} accepted your friend request`,
      body: null,
      data: { friendship_id: friendshipId },
      read: false,
    });

    set(s => {
      const accepted = s.pendingIn.find(f => f.id === friendshipId);
      return {
        pendingIn: s.pendingIn.filter(f => f.id !== friendshipId),
        pendingInCount: Math.max(0, s.pendingInCount - 1),
        friends: accepted ? [...s.friends, { ...accepted, status: 'accepted' as const }] : s.friends,
      };
    });
    toast.success('Friend request accepted!');
  },

  declineRequest: async (friendshipId) => {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
    if (error) { toast.error(error.message); return; }
    set(s => ({
      pendingIn: s.pendingIn.filter(f => f.id !== friendshipId),
      pendingInCount: Math.max(0, s.pendingInCount - 1),
    }));
  },

  removeFriend: async (friendshipId) => {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
    if (error) { toast.error(error.message); return; }
    set(s => ({ friends: s.friends.filter(f => f.id !== friendshipId) }));
    toast.success('Friend removed.');
  },

  sendMatchInvites: async (senderUsername, friendIds, match) => {
    const rows = friendIds.map(fid => ({
      user_id: fid,
      type: 'match_invite',
      title: `${senderUsername} invited you to a match`,
      body: match.title,
      data: { match_id: match.id, sport: match.sport, title: match.title },
      read: false,
    }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`Invitation${friendIds.length > 1 ? 's' : ''} sent!`);
  },

  reportUser: async (reporterId, reportedId, reason, details) => {
    const { error } = await supabase.from('user_reports').insert({
      reporter_id: reporterId,
      reported_id: reportedId,
      reason,
      details: details ?? null,
    });
    if (error?.code === '23505') {
      toast.error("You've already reported this user.");
      return;
    }
    if (error) { toast.error(error.message); return; }
    toast.success('Report submitted. Thank you.');
  },
}));
