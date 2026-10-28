'use client';

import { useEffect } from 'react';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useFriendStore } from '@/stores/friendStore';
import { useFriendActions } from '@/features/friends/hooks/useFriendActions';
import { usePlayerSearch } from '@/features/friends/hooks/usePlayerSearch';
import { PlayerSearch } from '@/features/friends/components';
import { BackButton } from '@/components/ui/BackButton';

export default function InviteFriendsPage() {
  const { profile } = useAuthStore();
  const { fetchFriends } = useFriendStore();

  const actions = useFriendActions();
  const { search, setSearch, results, searching } = usePlayerSearch(profile?.id);

  useEffect(() => {
    if (profile?.id) fetchFriends(profile.id);
  }, [profile?.id, fetchFriends]);

  const shareInviteLink = () => {
    const url = `${window.location.origin}/auth/register`;
    const text = 'Join me on MatchD — find and join sports matches near you! Sign up here:';
    if (navigator.share) {
      navigator.share({ title: 'Join MatchD', text, url }).catch(() => null);
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      toast.success('Invite link copied!');
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <BackButton />

      <div>
        <h1 className="font-heading font-bold text-2xl text-text">Invite Friends</h1>
        <p className="text-text-muted text-sm mt-1">
          Find players already on MatchD or share a link to invite others
        </p>
      </div>

      <PlayerSearch
        search={search}
        onSearchChange={setSearch}
        results={results}
        searching={searching}
        actions={actions}
      >
        <button
          onClick={shareInviteLink}
          className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl hover:bg-surface-alt transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
            <Share2 className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="text-sm font-medium text-text">Invite via link</p>
            <p className="text-xs text-text-muted mt-0.5">
              Share a link so friends can sign up and join you on MatchD
            </p>
          </div>
        </button>
      </PlayerSearch>
    </div>
  );
}
