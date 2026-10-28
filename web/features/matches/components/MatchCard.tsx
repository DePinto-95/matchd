import Link from 'next/link';
import { MapPin, Clock, Users, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { Match } from '@matchd/shared/types';
import { SportType } from '@matchd/shared/enums';
import { SPORTS } from '@matchd/shared/constants/sports';
import { Badge } from '@/components/ui/Badge';
import { getMatchOccupancy } from '../lib/occupancy';

interface MatchCardProps {
  match: Match;
}

export function MatchCard({ match }: MatchCardProps) {
  // Fall back to Other rather than crashing the whole grid if the DB ever
  // holds a sport this build does not know about (MD-10).
  const sport = SPORTS[match.sport] ?? SPORTS[SportType.Other];
  const actualPlayers = getMatchOccupancy(match);
  const spotsLeft = match.max_players - actualPlayers;
  const isFull = actualPlayers >= match.max_players;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group block bg-surface border border-border rounded-2xl overflow-hidden hover:border-brand/50 transition-all hover:shadow-lg hover:shadow-brand/5"
    >
      {/* Top color strip */}
      <div className="h-1" style={{ backgroundColor: sport.color }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{sport.emoji}</span>
            <div>
              <h3 className="font-heading font-semibold text-text text-base leading-tight group-hover:text-brand transition-colors line-clamp-1">
                {match.title}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">{sport.label}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {match.is_private && (
              <div className="flex items-center gap-1 text-text-muted">
                <Lock className="w-3 h-3" />
                <span className="text-xs">Private</span>
              </div>
            )}
            <Badge variant={isFull ? 'warning' : 'success'}>
              {isFull ? 'Full' : 'Open'}
            </Badge>
            {!isFull && (
              <span className="text-xs text-text-muted">{spotsLeft} spot{spotsLeft === 1 ? '' : 's'} left</span>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-text-muted text-xs">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{format(new Date(match.scheduled_at), 'EEE, MMM d · HH:mm')}</span>
            <span className="text-border">·</span>
            <span>{match.duration_minutes}min</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-muted text-xs">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{match.venues?.name ?? match.location_name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-muted text-xs">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{actualPlayers}/{match.max_players} players</span>
          </div>
        </div>

        {/* Footer */}
        {match.price_per_player > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-text-muted">Per player</span>
            <span className="text-sm font-semibold text-text">
              {match.price_per_player} {match.currency}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
