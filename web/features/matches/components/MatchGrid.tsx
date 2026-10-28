import { Match } from '@matchd/shared/types';
import { MatchCard } from './MatchCard';

const GRID = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
const SKELETON_COUNT = 6;

interface MatchGridProps {
  matches: Match[];
  loading: boolean;
  /** Shown instead of the grid when there is nothing to list. */
  empty: React.ReactNode;
}

/** The card grid shared by the home feed and Discover, with its loading state. */
export function MatchGrid({ matches, loading, empty }: MatchGridProps) {
  if (loading) {
    return (
      <div className={GRID}>
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-2xl h-44 animate-pulse" />
        ))}
      </div>
    );
  }

  if (matches.length === 0) return <>{empty}</>;

  return (
    <div className={GRID}>
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
