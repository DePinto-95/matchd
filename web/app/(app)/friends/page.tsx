'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Search, Users, UserCheck, UserX, Clock, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useFriendStore } from '@/stores/friendStore';
import { supabase } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { Profile } from '@/types';

type Tab = 'friends' | 'requests' | 'find';

export default function FriendsPage() {
  const { profile } = useAuthStore();
  const {
    friends, pendingIn, pendingOut, pendingInCount, loading,
    fetchFriends, sendRequest, cancelRequest, acceptRequest, declineRequest, removeFriend,
    getRelation,
  } = useFriendStore();

  const [tab, setTab] = useState<Tab>('friends');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (profile?.id) fetchFriends(profile.id);
  }, [profile?.id, fetchFriends]);

  useEffect(() => {
    if (tab !== 'find') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${search}%,full_name.ilike.%${search}%`)
        .neq('id', profile?.id ?? '')
        .limit(20);
      setSearchResults((data as Profile[]) ?? []);
      setSearching(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, tab, profile?.id]);

  const handleSendRequest = async (targetId: string) => {
    if (!profile) return;
    setActingOn(targetId);
    await sendRequest(profile.id, targetId, profile.username);
    setActingOn(null);
  };

  const handleCancelRequest = async (friendshipId: string) => {
    setActingOn(friendshipId);
    await cancelRequest(friendshipId);
    setActingOn(null);
  };

  const handleAccept = async (friendshipId: string) => {
    if (!profile) return;
    setActingOn(friendshipId);
    await acceptRequest(friendshipId, profile.username);
    setActingOn(null);
  };

  const handleDecline = async (friendshipId: string) => {
    setActingOn(friendshipId);
    await declineRequest(friendshipId);
    setActingOn(null);
  };

  const handleRemove = async (friendshipId: string) => {
    setActingOn(friendshipId);
    await removeFriend(friendshipId);
    setActingOn(null);
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-text">Friends</h1>
        <p className="text-text-muted text-sm mt-1">Connect with other players</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['friends', 'requests', 'find'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === t ? 'bg-brand/10 text-brand' : 'text-text-muted hover:text-text hover:bg-surface-alt'}`}
          >
            {t === 'friends' ? 'Friends' : t === 'requests' ? 'Requests' : 'Find People'}
            {t === 'requests' && pendingInCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand text-white text-[10px] flex items-center justify-center">
                {pendingInCount > 9 ? '9+' : pendingInCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Friends tab */}
      {tab === 'friends' && (
        loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-surface rounded-xl border border-border animate-pulse" />
            ))}
          </div>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Users className="w-12 h-12 text-border mb-4" />
            <h2 className="font-heading font-bold text-lg text-text mb-2">No friends yet</h2>
            <p className="text-text-muted text-sm">Use the Find People tab to search for players.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl">
                <Link href={`/players/${f.profiles!.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar src={f.profiles!.avatar_url} name={f.profiles!.full_name ?? f.profiles!.username} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text truncate">{f.profiles!.full_name ?? f.profiles!.username}</p>
                    <p className="text-xs text-text-muted">@{f.profiles!.username}</p>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={actingOn === f.id}
                  onClick={() => handleRemove(f.id)}
                >
                  <UserX className="w-4 h-4" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Requests tab */}
      {tab === 'requests' && (
        <div className="flex flex-col gap-6">
          {pendingIn.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Incoming</h3>
              {pendingIn.map(f => (
                <div key={f.id} className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl">
                  <Link href={`/players/${f.profiles!.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar src={f.profiles!.avatar_url} name={f.profiles!.full_name ?? f.profiles!.username} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text truncate">{f.profiles!.full_name ?? f.profiles!.username}</p>
                      <p className="text-xs text-text-muted">@{f.profiles!.username}</p>
                    </div>
                  </Link>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" loading={actingOn === f.id} onClick={() => handleAccept(f.id)}>
                      Accept
                    </Button>
                    <Button variant="ghost" size="sm" loading={actingOn === f.id} onClick={() => handleDecline(f.id)}>
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingOut.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Sent</h3>
              {pendingOut.map(f => (
                <div key={f.id} className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl">
                  <Link href={`/players/${f.profiles!.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar src={f.profiles!.avatar_url} name={f.profiles!.full_name ?? f.profiles!.username} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text truncate">{f.profiles!.full_name ?? f.profiles!.username}</p>
                      <p className="text-xs text-text-muted">@{f.profiles!.username}</p>
                    </div>
                  </Link>
                  <Button variant="ghost" size="sm" loading={actingOn === f.id} onClick={() => handleCancelRequest(f.id)}>
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          )}

          {pendingIn.length === 0 && pendingOut.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <UserCheck className="w-12 h-12 text-border mb-4" />
              <h2 className="font-heading font-bold text-lg text-text mb-2">No pending requests</h2>
              <p className="text-text-muted text-sm">When someone sends you a request, it'll appear here.</p>
            </div>
          )}
        </div>
      )}

      {/* Find People tab */}
      {tab === 'find' && (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by username or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-text placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm"
            />
          </div>

          {searching ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 bg-surface rounded-xl border border-border animate-pulse" />
              ))}
            </div>
          ) : search.trim() && searchResults.length === 0 ? (
            <p className="text-center text-text-muted text-sm py-8">No players found for &ldquo;{search}&rdquo;</p>
          ) : (
            <div className="flex flex-col gap-2">
              {searchResults.map(p => {
                const relation = getRelation(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl">
                    <Link href={`/players/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar src={p.avatar_url} name={p.full_name ?? p.username} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text truncate">{p.full_name ?? p.username}</p>
                        <p className="text-xs text-text-muted">@{p.username}</p>
                      </div>
                    </Link>
                    {relation.kind === 'none' && (
                      <Button size="sm" loading={actingOn === p.id} onClick={() => handleSendRequest(p.id)}>
                        <UserPlus className="w-4 h-4" />
                        Add
                      </Button>
                    )}
                    {relation.kind === 'pending_sent' && (
                      <Button variant="secondary" size="sm" loading={actingOn === relation.friendshipId} onClick={() => handleCancelRequest(relation.friendshipId)}>
                        <Clock className="w-4 h-4" />
                        Pending
                      </Button>
                    )}
                    {relation.kind === 'pending_received' && (
                      <Button size="sm" loading={actingOn === relation.friendshipId} onClick={() => handleAccept(relation.friendshipId)}>
                        <UserCheck className="w-4 h-4" />
                        Accept
                      </Button>
                    )}
                    {relation.kind === 'friends' && (
                      <Button variant="ghost" size="sm" disabled>
                        <UserCheck className="w-4 h-4" />
                        Friends
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
