export const FRIEND_TABS = ['friends', 'requests', 'find'] as const;
export type FriendTab = (typeof FRIEND_TABS)[number];

const LABELS: Record<FriendTab, string> = {
  friends: 'Friends',
  requests: 'Requests',
  find: 'Find People',
};

interface FriendsTabsProps {
  tab: FriendTab;
  onChange: (tab: FriendTab) => void;
  /** Incoming request count, badged on the Requests tab. */
  pendingInCount: number;
}

export function FriendsTabs({ tab, onChange, pendingInCount }: FriendsTabsProps) {
  return (
    <div className="flex gap-2">
      {FRIEND_TABS.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${tab === t ? 'bg-brand/10 text-brand' : 'text-text-muted hover:text-text hover:bg-surface-alt'}`}
        >
          {LABELS[t]}
          {t === 'requests' && pendingInCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand text-white text-[10px] flex items-center justify-center">
              {pendingInCount > 9 ? '9+' : pendingInCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
