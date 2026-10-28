'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Match } from '@matchd/shared/types';
import { useAuthStore } from '@/stores/authStore';
import { useFriendStore } from '@/stores/friendStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

interface ShareWithFriendsPanelProps {
  match: Match;
  onClose: () => void;
}

/** Pick friends and send them a match_invite notification. */
export function ShareWithFriendsPanel({ match, onClose }: ShareWithFriendsPanelProps) {
  const { profile } = useAuthStore();
  const { friends, sendMatchInvites } = useFriendStore();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const toggle = (friendId: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });

  const send = async () => {
    if (!profile || selectedIds.size === 0) return;
    setSending(true);
    await sendMatchInvites(profile.username, [...selectedIds], {
      id: match.id,
      sport: match.sport,
      title: match.title,
      invite_code: match.invite_code,
    });
    setSending(false);
    onClose();
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text">Send to Friends</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text">
          <X className="w-4 h-4" />
        </button>
      </div>

      {friends.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-4">
          Add some friends first to share matches with them.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {friends.map((f) => {
              const friend = f.profiles;
              if (!friend) return null;
              const selected = selectedIds.has(friend.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggle(friend.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors text-left
                    ${selected ? 'bg-brand/10' : 'hover:bg-surface-alt'}`}
                >
                  <input type="checkbox" checked={selected} readOnly className="accent-brand flex-shrink-0" />
                  <Avatar
                    src={friend.avatar_url}
                    name={friend.full_name ?? friend.username}
                    size="sm"
                  />
                  <span className="text-sm text-text">{friend.full_name ?? friend.username}</span>
                </button>
              );
            })}
          </div>

          <Button loading={sending} disabled={selectedIds.size === 0} onClick={send}>
            Send{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </Button>
        </>
      )}
    </div>
  );
}
