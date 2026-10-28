import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useFriendStore } from '@/stores/friendStore';

/**
 * The friend request actions plus which row is currently busy, so the right
 * button shows a spinner. Shared by the friends page and the invite page.
 */
export const useFriendActions = () => {
  const { profile } = useAuthStore();
  const { sendRequest, cancelRequest, acceptRequest, declineRequest, removeFriend } =
    useFriendStore();

  const [actingOn, setActingOn] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<void>) => {
    setActingOn(key);
    await action();
    setActingOn(null);
  };

  return {
    actingOn,

    send: (targetId: string) =>
      profile ? run(targetId, () => sendRequest(profile.id, targetId, profile.username)) : undefined,

    accept: (friendshipId: string) =>
      profile ? run(friendshipId, () => acceptRequest(friendshipId, profile.username)) : undefined,

    cancel: (friendshipId: string) => run(friendshipId, () => cancelRequest(friendshipId)),
    decline: (friendshipId: string) => run(friendshipId, () => declineRequest(friendshipId)),
    remove: (friendshipId: string) => run(friendshipId, () => removeFriend(friendshipId)),
  };
};

export type FriendActions = ReturnType<typeof useFriendActions>;
