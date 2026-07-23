'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useMatchStore } from '@/stores/matchStore';
import { useAuthStore } from '@/stores/authStore';
import { MatchCard } from '@/components/match/MatchCard';
import { FilterBar } from '@/components/match/FilterBar';
import { Input } from '@/components/ui/Input';
import { SportType } from '@/types';

export default function DiscoverPage() {
  const { matches, loading, filters, setFilters, fetchMatches } = useMatchStore();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches, filters]);

  // Upcoming full matches are hidden unless the current user is already in them.
  const filtered = matches
    .filter((match) => {
      if (filters.showPast) return true;
      const actual = match.match_participants
        ? match.match_participants.reduce(
            (sum, p) => sum + 1 + (p.extra_spots ?? 0) + (p.extra_spots_opponent ?? 0),
            0
          )
        : match.current_players;
      const isFull = actual >= match.max_players;
      if (!isFull) return true;
      return match.match_participants?.some((p) => p.player_id === user?.id) ?? false;
    })
    .filter((m) =>
      search === '' ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.location_name.toLowerCase().includes(search.toLowerCase()) ||
      m.venues?.name?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-text">Discover</h1>
        <p className="text-text-muted text-sm mt-1">Find the perfect match for you</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search by title, location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-text placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors text-sm"
        />
      </div>

      <FilterBar
        selected={filters.sport}
        onSelect={(sport: SportType | 'all') => setFilters({ sport })}
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-2xl h-44 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-4xl">🔍</span>
          <p className="text-text-muted mt-3 text-sm">No matches found for your search</p>
        </div>
      ) : (
        <>
          <p className="text-text-muted text-sm">{filtered.length} match{filtered.length !== 1 ? 'es' : ''} found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
