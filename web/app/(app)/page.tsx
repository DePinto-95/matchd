'use client';

import { useEffect } from 'react';
import { Plus, RefreshCw, History } from 'lucide-react';
import Link from 'next/link';
import { useMatchStore } from '@/stores/matchStore';
import { useAuthStore } from '@/stores/authStore';
import { MatchCard } from '@/components/match/MatchCard';
import { FilterBar } from '@/components/match/FilterBar';
import { Button } from '@/components/ui/Button';
import { SportType } from '@/types';

export default function HomePage() {
  const { matches, loading, filters, setFilters, fetchMatches } = useMatchStore();
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches, filters]);

  const handleSportFilter = (sport: SportType | 'all') => {
    setFilters({ sport });
  };

  const togglePast = () => {
    setFilters({ showPast: !filters.showPast });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text">
            {profile?.username ? `Hey, ${profile.username} 👋` : 'Find your game'}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {matches.length} {matches.length === 1 ? 'match' : 'matches'} {filters.showPast ? 'in history' : 'available'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={togglePast}
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

      {/* Filter bar */}
      <FilterBar selected={filters.sport} onSelect={handleSportFilter} />

      {/* Match grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-2xl h-44 animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
