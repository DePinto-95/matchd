import { SPORTS } from '@matchd/shared/constants/sports';
import { getRatingColor } from '@matchd/shared/constants/theme';
import { PlayerRating } from '@matchd/shared/types';

/** A rating stays hidden until the player has this many matches in that sport. */
export const MATCHES_TO_UNLOCK_RATING = 5;

interface RatingsCardProps {
  ratings: PlayerRating[];
  /** Matches actually played per sport, which is what unlocks a rating. */
  playedCounts: Record<string, number>;
}

/** Per-sport ratings, or progress towards unlocking them. */
export function RatingsCard({ ratings, playedCounts }: RatingsCardProps) {
  if (ratings.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <h2 className="font-heading font-bold text-lg text-text mb-4">Ratings</h2>
      <div className="flex flex-col gap-4">
        {ratings.map((r) => (
          <RatingRow
            key={r.id}
            rating={r}
            played={playedCounts[r.sport] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}

function RatingRow({ rating, played }: { rating: PlayerRating; played: number }) {
  const sport = SPORTS[rating.sport];
  const unlocked = played >= MATCHES_TO_UNLOCK_RATING;
  const color = getRatingColor(rating.rating);
  const remaining = MATCHES_TO_UNLOCK_RATING - played;

  return (
    <div className="flex items-center gap-3">
      <span className={`text-xl${unlocked ? '' : ' opacity-40'}`}>{sport?.emoji ?? '🏅'}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium${unlocked ? ' text-text' : ' text-text-muted'}`}>
            {sport?.label ?? rating.sport}
          </span>
          {unlocked ? (
            <span className="text-sm font-bold" style={{ color }}>{rating.rating.toFixed(1)}</span>
          ) : (
            <span className="text-xs text-text-muted">{played} / {MATCHES_TO_UNLOCK_RATING}</span>
          )}
        </div>

        <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
          {unlocked ? (
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(rating.rating / 10) * 100}%`, backgroundColor: color }}
            />
          ) : (
            <div
              className="h-full rounded-full bg-text-muted/30 transition-all"
              style={{ width: `${(played / MATCHES_TO_UNLOCK_RATING) * 100}%` }}
            />
          )}
        </div>

        <p className="text-xs text-text-muted mt-0.5">
          {unlocked
            ? `${played} matches · ${rating.wins} confirmed wins`
            : `${remaining} more ${remaining === 1 ? 'match' : 'matches'} to go`}
        </p>
      </div>
    </div>
  );
}
