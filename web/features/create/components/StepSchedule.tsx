import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';
import { DURATIONS, IS_DEV } from '../lib/constants';

interface StepScheduleProps {
  date: string;
  time: string;
  duration: number;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onDurationChange: (minutes: number) => void;
  onFillTestMatch: () => void;
}

export function StepSchedule({
  date,
  time,
  duration,
  onDateChange,
  onTimeChange,
  onDurationChange,
  onFillTestMatch,
}: StepScheduleProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Dev-only shortcut for testing the post-match flows (MD-09). */}
      {IS_DEV && (
        <button
          type="button"
          onClick={onFillTestMatch}
          className="self-start px-3 py-1.5 rounded-lg text-xs font-semibold bg-warning/15 text-warning border border-warning/30 hover:bg-warning/25 transition-colors"
        >
          ⚡ Fill: 1 min test
        </button>
      )}

      <DatePicker label="Date *" value={date} onChange={onDateChange} />
      <TimePicker label="Time * (24h)" value={time} onChange={onTimeChange} />

      <div>
        <label className="text-sm font-medium text-text-muted mb-2 block">Duration</label>
        <div className="flex gap-2 flex-wrap">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => onDurationChange(d)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm border-2 transition-all
                ${duration === d ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-muted hover:border-text-muted'}`}
            >
              {d}m
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
