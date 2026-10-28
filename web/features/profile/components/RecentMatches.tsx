import { Match } from '@matchd/shared/types';
import { MatchCard } from '@/components/match/MatchCard';

const MAX_SHOWN = 4;

export function RecentMatches({ matches }: { matches: Match[] }) {
  if (matches.length === 0) return null;

  return (
    <div>
      <h2 className="font-heading font-bold text-lg text-text mb-4">Recent Matches</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {matches.slice(0, MAX_SHOWN).map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>
    </div>
  );
}
