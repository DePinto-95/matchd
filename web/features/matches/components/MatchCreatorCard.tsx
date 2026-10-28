import Link from 'next/link';
import { Match } from '@matchd/shared/types';
import { Avatar } from '@/components/ui/Avatar';

/** Who created the match, and the venue it is booked at, if any. */
export function MatchCreatorCard({ match }: { match: Match }) {
  if (!match.profiles && !match.venues) return null;

  return (
    <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
      {match.profiles && (
        <Link
          href={`/players/${match.profiles.id}`}
          className="flex items-center gap-3 p-4 hover:bg-surface-alt transition-colors"
        >
          <Avatar src={match.profiles.avatar_url} name={match.profiles.username} size="sm" />
          <div>
            <p className="text-xs text-text-muted">Created by</p>
            <p className="text-sm font-medium text-text">
              {match.profiles.full_name ?? match.profiles.username}
            </p>
          </div>
        </Link>
      )}
      {match.venues && (
        <Link
          href={`/venues/${match.venues.id}`}
          className="flex items-center gap-3 p-4 hover:bg-surface-alt transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-surface-alt flex items-center justify-center text-lg">
            🏟️
          </div>
          <div>
            <p className="text-xs text-text-muted">Venue</p>
            <p className="text-sm font-medium text-text">{match.venues.name}</p>
          </div>
        </Link>
      )}
    </div>
  );
}
