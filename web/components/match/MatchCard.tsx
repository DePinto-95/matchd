import Link from 'next/link';
import { MapPin, Clock, Users, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { Match } from '@/types';
import { SPORTS } from '@/constants/sports';
import { Badge } from '@/components/ui/Badge';

interface MatchCardProps {
  match: Match;
}

function getSportColor(sport: string): string {
  const colors: Record<string, string> = {
    football: '#22c55e',
    mini_football_5v5: '#3b82f6',
    mini_football_8v8: '#8b5cf6',
    padel: '#f59e0b',
    tennis: '#ef4444',
    basketball: '#f97316',
    volleyball: '#06b6d4',
    other: '#6b7280',
  };
  return colors[sport] ?? '#6b7280';
}

export function MatchCard({ match }: MatchCardProps) {
  const sport = SPORTS[match.sport];
  const actualPlayers = match.match_participants
    ? match.match_participants.reduce(
        (sum, p) => sum + 1 + (p.extra_spots ?? 0) + (p.extra_spots_opponent ?? 0),
        0
      )
    : match.current_players;
  const spotsLeft = match.max_players - actualPlayers;
  const isFull = actualPlayers >= match.max_players;
  const color = getSportColor(match.sport);

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group block bg-surface border border-border rounded-2xl overflow-hidden hover:border-brand/50 transition-all hover:shadow-lg hover:shadow-brand/5"
    >
      {/* Top color strip */}
      <div className="h-1" style={{ backgroundColor: color }} />

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
            <Badge variant={isFull ? 'error' : spotsLeft <= 3 ? 'warning' : 'success'}>
              {isFull ? 'Full' : `${spotsLeft} spots`}
            </Badge>
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
