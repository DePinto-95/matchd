import { MatchParticipant } from '@matchd/shared/types';
import { RatePlayerRow } from './RatePlayerRow';

interface RateSectionProps {
  label: string;
  players: MatchParticipant[];
  showSkip: boolean;
  scores: Record<string, number>;
  rated: Set<string>;
  submitting: boolean;
  onScoreChange: (playerId: string, score: number) => void;
  onRate: (participant: MatchParticipant) => void;
  onSkip: (playerId: string) => void;
}

/** A labelled group of players to rate, e.g. "Your team" or "Opponents". */
export function RateSection({
  label,
  players,
  showSkip,
  scores,
  rated,
  submitting,
  onScoreChange,
  onRate,
  onSkip,
}: RateSectionProps) {
  if (players.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-text-muted uppercase tracking-wide px-1">{label}</p>
      {players.map((p) => (
        <RatePlayerRow
          key={p.id}
          participant={p}
          score={scores[p.player_id]}
          isRated={rated.has(p.player_id)}
          submitting={submitting}
          showSkip={showSkip}
          onScoreChange={(score) => onScoreChange(p.player_id, score)}
          onRate={() => onRate(p)}
          onSkip={() => onSkip(p.player_id)}
        />
      ))}
    </div>
  );
}
