import { Clock, Lock, MapPin, Star, Users } from 'lucide-react';
import { SPORTS } from '@matchd/shared/constants/sports';
import { formatMatchDate, formatPrice } from '@matchd/shared/lib/helpers';
import { Match } from '@matchd/shared/types';
import { MatchStatus } from '@matchd/shared/enums';
import { Badge } from '@/components/ui/Badge';

interface MatchHeroProps {
  match: Match;
  /** Places taken, counting held spots — may be ahead of `match.current_players`. */
  occupancy: number;
  isFull: boolean;
}

export function MatchHero({ match, occupancy, isFull }: MatchHeroProps) {
  const sport = SPORTS[match.sport];

  // The stored status can lag behind held spots, so show FULL once it really is.
  const displayStatus =
    match.status === MatchStatus.Open && isFull ? MatchStatus.Full : match.status;
  const statusVariant =
    displayStatus === MatchStatus.Open
      ? 'success'
      : displayStatus === MatchStatus.Full
        ? 'warning'
        : 'error';

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: sport.color }} />
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{sport.emoji}</span>
            <div>
              <h1 className="font-heading font-bold text-xl text-text">{match.title}</h1>
              <p className="text-text-muted text-sm">{sport.label}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={statusVariant}>{displayStatus.replace('_', ' ').toUpperCase()}</Badge>
            {match.is_private && (
              <div className="flex items-center gap-1 text-text-muted text-xs">
                <Lock className="w-3 h-3" />
                <span>Invite only</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm text-text">
            <Clock className="w-4 h-4 text-text-muted flex-shrink-0" />
            <span>{formatMatchDate(match.scheduled_at)} · {match.duration_minutes}min</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-text">
            <MapPin className="w-4 h-4 text-text-muted flex-shrink-0" />
            <span>{match.venues?.name ?? match.location_name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-text">
            <Users className="w-4 h-4 text-text-muted flex-shrink-0" />
            <span>{occupancy}/{match.max_players} players · {match.team_size}v{match.team_size}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-text">
            <Star className="w-4 h-4 text-text-muted flex-shrink-0" />
            <span>Rating {match.min_rating}–{match.max_rating}</span>
            <span
              className="ml-auto font-semibold"
              style={{ color: match.price_per_player > 0 ? '#f59e0b' : '#22c55e' }}
            >
              {formatPrice(match.price_per_player, match.currency)}
            </span>
          </div>
        </div>

        {match.description && (
          <p className="mt-4 text-text-muted text-sm leading-relaxed border-t border-border pt-4">
            {match.description}
          </p>
        )}
      </div>
    </div>
  );
}
