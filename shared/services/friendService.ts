import type { SupabaseClient } from '@supabase/supabase-js';
import { FriendshipStatus } from '../enums';
import { Friendship, Profile } from '../types';
import { DataResult, MutationResult } from './types';

/**
 * An accepted friendship joins both sides, so the caller can pick whichever one
 * is not the current user as "the friend".
 */
type AcceptedRow = Omit<Friendship, 'profiles'> & {
  requester: Profile;
  addressee: Profile;
};

export interface FriendLists {
  friends: Friendship[];
  pendingIn: Friendship[];
  pendingOut: Friendship[];
}

export const createFriendService = (supabase: SupabaseClient) => ({
  /** All three friendship lists for a user, fetched in parallel. */
  listAll: async (userId: string): Promise<FriendLists> => {
    const [acceptedRes, incomingRes, outgoingRes] = await Promise.all([
      supabase
        .from('friendships')
        .select('*, requester:requester_id(*), addressee:addressee_id(*)')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq('status', FriendshipStatus.Accepted),
      supabase
        .from('friendships')
        .select('*, profiles:requester_id(*)')
        .eq('addressee_id', userId)
        .eq('status', FriendshipStatus.Pending),
      supabase
        .from('friendships')
        .select('*, profiles:addressee_id(*)')
        .eq('requester_id', userId)
        .eq('status', FriendshipStatus.Pending),
    ]);

    const friends = ((acceptedRes.data ?? []) as unknown as AcceptedRow[]).map((f) => ({
      ...f,
      profiles: f.requester_id === userId ? f.addressee : f.requester,
    }));

    return {
      friends,
      pendingIn: (incomingRes.data ?? []) as unknown as Friendship[],
      pendingOut: (outgoingRes.data ?? []) as unknown as Friendship[],
    };
  },

  sendRequest: async (
    requesterId: string,
    addresseeId: string
  ): Promise<DataResult<Friendship>> => {
    const { data, error } = await supabase
      .from('friendships')
      .insert({
        requester_id: requesterId,
        addressee_id: addresseeId,
        status: FriendshipStatus.Pending,
      })
      .select()
      .single();
    return { data: (data as Friendship) ?? null, error };
  },

  accept: async (friendshipId: string): Promise<DataResult<Friendship>> => {
    const { data, error } = await supabase
      .from('friendships')
      .update({ status: FriendshipStatus.Accepted })
      .eq('id', friendshipId)
      .select()
      .single();
    return { data: (data as Friendship) ?? null, error };
  },

  /** Cancelling, declining and unfriending are all the same DELETE. */
  remove: async (friendshipId: string): Promise<MutationResult> => {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
    return { error };
  },
});

export type FriendService = ReturnType<typeof createFriendService>;
