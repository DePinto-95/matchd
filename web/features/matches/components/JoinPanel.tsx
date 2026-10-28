import { TeamSide } from '@matchd/shared/enums';

interface SideOption {
  side: TeamSide;
  label: string;
  count: number;
  open: number;
  color: string;
}

interface JoinPanelProps {
  teamSize: number;
  homeLabel: string;
  awayLabel: string;
  homeCount: number;
  awayCount: number;
  homeOpen: number;
  awayOpen: number;
  selectedSide: TeamSide | null;
  onSelectSide: (side: TeamSide) => void;
  /** Total places the joiner is taking: themselves plus any held for their squad. */
  squadSpots: number;
  onSquadSpotsChange: (spots: number) => void;
}

/** "Choose your side", plus how many places to hold on it. */
export function JoinPanel({
  teamSize,
  homeLabel,
  awayLabel,
  homeCount,
  awayCount,
  homeOpen,
  awayOpen,
  selectedSide,
  onSelectSide,
  squadSpots,
  onSquadSpotsChange,
}: JoinPanelProps) {
  const sides: SideOption[] = [
    { side: TeamSide.Home, label: homeLabel, count: homeCount, open: homeOpen, color: '#3b82f6' },
    { side: TeamSide.Away, label: awayLabel, count: awayCount, open: awayOpen, color: '#f97316' },
  ];

  const selectedTeamOpen =
    selectedSide === TeamSide.Home ? homeOpen : selectedSide === TeamSide.Away ? awayOpen : 0;

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4">
      <h3 className="font-semibold text-text">Choose your side</h3>
      <div className="grid grid-cols-2 gap-3">
        {sides.map(({ side, label, count, open, color }) => {
          const selected = selectedSide === side;
          const full = open === 0;
          return (
            <button
              key={side}
              onClick={() => { if (!full) onSelectSide(side); }}
              disabled={full}
              className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${full ? 'opacity-40 cursor-not-allowed' : ''}`}
              style={{
                borderColor: selected ? color : '#2a2a3d',
                background: selected ? `${color}15` : '#13131a',
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="font-semibold text-sm" style={{ color: selected ? color : '#f0f0ff' }}>
                {label}
              </span>
              <span className="text-xs text-text-muted">{count}/{teamSize} · {open} open</span>
              {full && <span className="text-xs text-error">Full</span>}
            </button>
          );
        })}
      </div>

      {selectedSide && selectedTeamOpen > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <span className="text-sm text-text">Total spots to reserve</span>
            <p className="text-xs text-text-muted mt-0.5">
              1 for you{squadSpots > 1 ? ` + ${squadSpots - 1} held for your squad` : ''} · max {selectedTeamOpen}
            </p>
          </div>
          <button
            onClick={() => onSquadSpotsChange(Math.max(1, squadSpots - 1))}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-brand hover:bg-surface-alt"
          >
            −
          </button>
          <span className="text-lg font-bold text-text w-6 text-center">{squadSpots}</span>
          <button
            onClick={() => onSquadSpotsChange(Math.min(selectedTeamOpen, squadSpots + 1))}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-brand hover:bg-surface-alt"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
