'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search, UserPlus, UserCheck, Clock, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useFriendStore } from '@/stores/friendStore';
import { supabase } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { Profile } from '@/types';

export default function InviteFriendsPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { fetchFriends, sendRequest, cancelRequest, acceptRequest, getRelation } = useFriendStore();

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (profile?.id) fetchFriends(profile.id);
  }, [profile?.id, fetchFriends]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${search}%,full_name.ilike.%${search}%`)
        .neq('id', profile?.id ?? '')
        .limit(20);
      setResults((data as Profile[]) ?? []);
      setSearching(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, profile?.id]);

  const handleSendRequest = async (targetId: string) => {
    if (!profile) return;
    setActingOn(targetId);
    await sendRequest(profile.id, targetId, profile.username);
    setActingOn(null);
  };

  const handleCancel = async (friendshipId: string) => {
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

  const handleShareInvite = () => {
    const url = `${window.location.origin}/auth/register`;
    const text = `Join me on MatchD — find and join sports matches near you! Sign up here:`;
    if (navigator.share) {
      navigator.share({ title: 'Join MatchD', text, url }).catch(() => null);
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      toast.success('Invite link copied!');
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-text-muted hover:text-text transition-colors w-fit"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </button>

      <div>
        <h1 className="font-heading font-bold text-2xl text-text">Invite Friends</h1>
        <p className="text-text-muted text-sm mt-1">Find players already on MatchD or share a link to invite others</p>
      </div>

      {/* Search existing players */}
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

        {/* Invite via link — shown below search bar */}
        <button
          onClick={handleShareInvite}
          className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl hover:bg-surface-alt transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
            <Share2 className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="text-sm font-medium text-text">Invite via link</p>
            <p className="text-xs text-text-muted mt-0.5">Share a link so friends can sign up and join you on MatchD</p>
          </div>
        </button>

        {/* Search results */}
        {searching ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-surface rounded-xl border border-border animate-pulse" />
            ))}
          </div>
        ) : search.trim() && results.length === 0 ? (
          <p className="text-center text-text-muted text-sm py-8">No players found for &ldquo;{search}&rdquo;</p>
        ) : (
          <div className="flex flex-col gap-2">
            {results.map(p => {
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
                    <Button variant="secondary" size="sm" loading={actingOn === relation.friendshipId} onClick={() => handleCancel(relation.friendshipId)}>
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
    </div>
  );
}
