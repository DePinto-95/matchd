'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useFriendStore } from '@/stores/friendStore';
import { useFriendActions } from '@/features/friends/hooks/useFriendActions';
import { usePlayerSearch } from '@/features/friends/hooks/usePlayerSearch';
import {
  FriendsList,
  FriendsTabs,
  PendingRequests,
  PlayerSearch,
  type FriendTab,
} from '@/features/friends/components';

export default function FriendsPage() {
  const { profile } = useAuthStore();
  const { friends, pendingIn, pendingOut, pendingInCount, loading, fetchFriends } = useFriendStore();

  const [tab, setTab] = useState<FriendTab>('friends');
  const actions = useFriendActions();
  const { search, setSearch, results, searching } = usePlayerSearch(profile?.id, tab === 'find');

  useEffect(() => {
    if (profile?.id) fetchFriends(profile.id);
  }, [profile?.id, fetchFriends]);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-text">Friends</h1>
        <p className="text-text-muted text-sm mt-1">Connect with other players</p>
      </div>

      <FriendsTabs tab={tab} onChange={setTab} pendingInCount={pendingInCount} />

      {tab === 'friends' && (
        <FriendsList friends={friends} loading={loading} actions={actions} />
      )}

      {tab === 'requests' && (
        <PendingRequests pendingIn={pendingIn} pendingOut={pendingOut} actions={actions} />
      )}

      {tab === 'find' && (
        <PlayerSearch
          search={search}
          onSearchChange={setSearch}
          results={results}
          searching={searching}
          actions={actions}
        />
      )}
    </div>
  );
}
