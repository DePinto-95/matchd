interface ScoreInputProps {
  homeScore: string;
  awayScore: string;
  onHomeChange: (value: string) => void;
  onAwayChange: (value: string) => void;
}

/** The Home – Away score entry pair, shared by the report and dispute panels. */
export function ScoreInput({
  homeScore,
  awayScore,
  onHomeChange,
  onAwayChange,
}: ScoreInputProps) {
  const field = 'w-full text-center px-3 py-2 rounded-lg bg-surface border border-border text-text text-lg font-bold focus:outline-none focus:border-brand';

  return (
    <div className="grid grid-cols-3 items-center gap-2">
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-text-muted">Home</span>
        <input
          type="number" min="0" placeholder="0"
          value={homeScore}
          onChange={(e) => onHomeChange(e.target.value)}
          className={field}
        />
      </div>
      <div className="text-center text-2xl font-bold text-text-muted">–</div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-text-muted">Away</span>
        <input
          type="number" min="0" placeholder="0"
          value={awayScore}
          onChange={(e) => onAwayChange(e.target.value)}
          className={field}
        />
      </div>
    </div>
  );
}
