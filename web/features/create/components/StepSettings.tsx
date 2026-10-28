import { SportConfig } from '@matchd/shared/constants/sports';
import { Input } from '@/components/ui/Input';

interface StepSettingsProps {
  minRating: string;
  maxRating: string;
  onMinRatingChange: (value: string) => void;
  onMaxRatingChange: (value: string) => void;
  isPrivate: boolean;
  onPrivateChange: (value: boolean) => void;

  /** Everything below is read-only, for the summary card. */
  sportConfig: SportConfig | null;
  teamSize: number;
  maxPlayers: number;
  locationName: string;
  date: string;
  time: string;
  duration: number;
}

export function StepSettings({
  minRating,
  maxRating,
  onMinRatingChange,
  onMaxRatingChange,
  isPrivate,
  onPrivateChange,
  sportConfig,
  teamSize,
  maxPlayers,
  locationName,
  date,
  time,
  duration,
}: StepSettingsProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="font-semibold text-text mb-1">Rating Range</h3>
        <p className="text-text-muted text-sm mb-4">
          Only players with a rating in this range can join.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Min Rating"
            type="number"
            min="1" max="10" step="0.1"
            value={minRating}
            onChange={(e) => onMinRatingChange(e.target.value)}
          />
          <Input
            label="Max Rating"
            type="number"
            min="1" max="10" step="0.1"
            value={maxRating}
            onChange={(e) => onMaxRatingChange(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="font-semibold text-text">Invite Only</p>
          <p className="text-text-muted text-sm mt-0.5">
            Only players with the invite link can join
          </p>
        </div>
        <button
          onClick={() => onPrivateChange(!isPrivate)}
          className={`relative w-12 h-6 rounded-full transition-colors ${isPrivate ? 'bg-brand' : 'bg-border'}`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isPrivate ? 'left-7' : 'left-1'}`}
          />
        </button>
      </div>

      {sportConfig && (
        <div className="bg-surface-alt border border-border rounded-xl p-5 flex flex-col gap-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
            Match Summary{isPrivate ? ' · 🔒 Invite Only' : ''}
          </p>
          <p className="text-text text-sm">
            {sportConfig.emoji} {sportConfig.label} · {teamSize}v{teamSize} · {maxPlayers} players max
          </p>
          <p className="text-text text-sm">📍 {locationName || '—'}</p>
          <p className="text-text text-sm">📅 {date} at {time}</p>
          <p className="text-text text-sm">⏱ {duration} minutes</p>
          <p className="text-text text-sm">⭐ Rating {minRating}–{maxRating}</p>
        </div>
      )}
    </div>
  );
}
