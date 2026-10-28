'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { History, Plus, RefreshCw } from 'lucide-react';
import { SportType } from '@matchd/shared/enums';
import { useMatchStore } from '@/stores/matchStore';
import { useAuthStore } from '@/stores/authStore';
import { FilterBar, MatchGrid } from '@/features/matches/components';
import { filterVisibleMatches } from '@/features/matches/lib/occupancy';
import { Button } from '@/components/ui/Button';

// Home feed — the app's main landing page after login.
// Lives at app/(app)/page.tsx: the "(app)" segment is a Next.js route
// group that applies the authenticated Navbar layout without adding a
// URL segment, so this renders at "/".
export default function HomePage() {
  const { matches, loading, filters, setFilters, fetchMatches } = useMatchStore();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches, filters]);

  const visibleMatches = filterVisibleMatches(matches, user?.id, filters.showPast);

  const emptyState = (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4">🏅</span>
      <h2 className="font-heading font-bold text-xl text-text mb-2">No matches found</h2>
      <p className="text-text-muted text-sm mb-6 max-w-sm">
        {filters.showPast
          ? 'No past matches found for this filter.'
          : filters.sport !== 'all'
            ? 'No upcoming matches for this sport. Try another sport or create one.'
            : 'No upcoming matches right now. Be the first to create one!'}
      </p>
      {!filters.showPast && (
        <Link href="/create">
          <Button>
            <Plus className="w-4 h-4" />
            Create a Match
          </Button>
        </Link>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text">
            {profile?.username ? `Hey, ${profile.username} 👋` : 'Find your game'}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {visibleMatches.length} {visibleMatches.length === 1 ? 'match' : 'matches'}{' '}
            {filters.showPast ? 'in history' : 'available'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilters({ showPast: !filters.showPast })}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-colors text-sm font-medium ${
              filters.showPast
                ? 'bg-brand/15 border-brand text-brand'
                : 'border-border text-text-muted hover:text-text hover:bg-surface-alt'
            }`}
            title={filters.showPast ? 'Show upcoming matches' : 'Show past matches'}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">{filters.showPast ? 'Past' : 'History'}</span>
          </button>
          <button
            onClick={() => fetchMatches()}
            className="p-2 rounded-xl hover:bg-surface-alt transition-colors text-text-muted hover:text-text"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/create">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              New Match
            </Button>
          </Link>
        </div>
      </div>

      <FilterBar
        selected={filters.sport}
        onSelect={(sport: SportType | 'all') => setFilters({ sport })}
      />

      <MatchGrid matches={visibleMatches} loading={loading} empty={emptyState} />
    </div>
  );
}
