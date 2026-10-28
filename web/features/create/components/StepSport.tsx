import { SPORT_LIST } from '@matchd/shared/constants/sports';
import { SportType } from '@matchd/shared/enums';

interface StepSportProps {
  sport: SportType | null;
  teamSize: number;
  teamSizes: number[];
  maxPlayers: number;
  onSelectSport: (sport: SportType) => void;
  onSelectTeamSize: (size: number) => void;
  onMaxPlayersChange: (next: number) => void;
}

/** Sport grid, then that sport's team size and total capacity. */
export function StepSport({
  sport,
  teamSize,
  teamSizes,
  maxPlayers,
  onSelectSport,
  onSelectTeamSize,
  onMaxPlayersChange,
}: StepSportProps) {
  const stepperButton = 'w-9 h-9 rounded-full border border-border flex items-center justify-center text-brand text-lg hover:bg-surface-alt transition-colors';

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SPORT_LIST.map((s) => {
          const active = sport === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelectSport(s.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                ${active ? 'border-brand bg-brand/10' : 'border-border hover:border-text-muted bg-surface'}`}
            >
              <span className="text-3xl">{s.emoji}</span>
              <span className={`text-sm font-medium ${active ? 'text-brand' : 'text-text'}`}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {sport && (
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-5">
          <div>
            <label className="text-sm font-medium text-text-muted mb-2 block">Team Size</label>
            <div className="flex gap-2 flex-wrap">
              {teamSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => onSelectTeamSize(size)}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm border-2 transition-all
                    ${teamSize === size ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-muted hover:border-text-muted'}`}
                >
                  {size}v{size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-muted mb-2 block">Max Players</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => onMaxPlayersChange(Math.max(2, maxPlayers - 1))}
                className={stepperButton}
              >
                −
              </button>
              <span className="text-2xl font-bold text-text w-10 text-center">{maxPlayers}</span>
              <button onClick={() => onMaxPlayersChange(maxPlayers + 1)} className={stepperButton}>
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
