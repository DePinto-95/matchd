import { MatchParticipant } from '@matchd/shared/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

interface RatePlayerRowProps {
  participant: MatchParticipant;
  score: number | undefined;
  isRated: boolean;
  submitting: boolean;
  /** Assigned players can be skipped; optional extra players cannot. */
  showSkip: boolean;
  onScoreChange: (score: number) => void;
  onRate: () => void;
  onSkip: () => void;
}

export function RatePlayerRow({
  participant,
  score,
  isRated,
  submitting,
  showSkip,
  onScoreChange,
  onRate,
  onSkip,
}: RatePlayerRowProps) {
  return (
    <div
      className={`border rounded-xl p-4 flex items-center gap-4 transition-colors ${
        isRated ? 'bg-success/5 border-success/30' : 'bg-surface border-border'
      }`}
    >
      <Avatar src={participant.profiles?.avatar_url} name={participant.profiles?.username} size="md" />
      <div className="flex-1">
        <p className="font-medium text-text">{participant.profiles?.username ?? 'Player'}</p>
        {isRated && <p className="text-xs text-success mt-0.5">Rated ✓</p>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1" max="10" step="0.1"
          placeholder="Score"
          value={score ?? ''}
          onChange={(e) => onScoreChange(parseFloat(e.target.value))}
          className={`w-20 px-3 py-2 rounded-lg bg-surface-alt border text-text text-sm text-center focus:outline-none focus:border-brand ${
            isRated ? 'border-success/50' : 'border-border'
          }`}
        />
        <Button size="sm" loading={submitting} variant={isRated ? 'secondary' : 'primary'} onClick={onRate}>
          {isRated ? 'Update' : 'Rate'}
        </Button>
        {showSkip && !isRated && (
          <button
            onClick={onSkip}
            className="text-xs text-text-muted hover:text-text transition-colors px-2 py-1.5"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
