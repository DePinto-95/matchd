'use client';

import { Search } from 'lucide-react';
import { Profile } from '@matchd/shared/types';
import { useFriendStore } from '@/stores/friendStore';
import { FriendActions } from '../hooks/useFriendActions';
import { PlayerSearchRow } from './PlayerSearchRow';
import { SkeletonRows } from './SkeletonRows';

interface PlayerSearchProps {
  search: string;
  onSearchChange: (value: string) => void;
  results: Profile[];
  searching: boolean;
  actions: FriendActions;
  /** Rendered between the input and the results, e.g. the "Invite via link" card. */
  children?: React.ReactNode;
}

/** Search box plus results, used by both the Find People tab and the invite page. */
export function PlayerSearch({
  search,
  onSearchChange,
  results,
  searching,
  actions,
  children,
}: PlayerSearchProps) {
  const { getRelation } = useFriendStore();

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search by username or name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-text placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm"
        />
      </div>

      {children}

      {searching ? (
        <SkeletonRows />
      ) : search.trim() && results.length === 0 ? (
        <p className="text-center text-text-muted text-sm py-8">
          No players found for &ldquo;{search}&rdquo;
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((p) => (
            <PlayerSearchRow
              key={p.id}
              profile={p}
              relation={getRelation(p.id)}
              actions={actions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
