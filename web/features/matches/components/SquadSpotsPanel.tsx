'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface SquadSpotsPanelProps {
  /** Spots already held on each side, which the steppers start from. */
  currentOwnSpots: number;
  currentOpponentSpots: number;
  /** Further spots still free on each side. */
  ownOpenSlots: number;
  opponentOpenSlots: number;
  saving: boolean;
  onConfirm: (totalOwnSpots: number, opponentSpots: number) => Promise<boolean | void>;
  onClose: () => void;
}

interface StepperProps {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function Stepper({ label, hint, value, min, max, onChange }: StepperProps) {
  const button = 'w-8 h-8 rounded-full border border-border flex items-center justify-center text-brand hover:bg-surface-alt';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <span className="text-sm font-medium text-text">{label}</span>
        <p className="text-xs text-text-muted mt-0.5">{hint}</p>
      </div>
      <button onClick={() => onChange(Math.max(min, value - 1))} className={button}>−</button>
      <span className="text-lg font-bold text-text w-6 text-center">{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} className={button}>+</button>
    </div>
  );
}

/**
 * Lets a participant hold places for people they are bringing — on their own
 * team, on the opposing team, or both.
 *
 * The panel unmounts when closed, so the steppers re-read the held spots from
 * props each time it opens.
 */
export function SquadSpotsPanel({
  currentOwnSpots,
  currentOpponentSpots,
  ownOpenSlots,
  opponentOpenSlots,
  saving,
  onConfirm,
  onClose,
}: SquadSpotsPanelProps) {
  // "Total" includes the participant themselves, hence the +1.
  const [totalOwn, setTotalOwn] = useState(currentOwnSpots + 1);
  const [opponent, setOpponent] = useState(currentOpponentSpots);

  const maxOwn = currentOwnSpots + ownOpenSlots + 1;
  const maxOpponent = currentOpponentSpots + opponentOpenSlots;

  const confirm = async () => {
    const ok = await onConfirm(totalOwn, opponent);
    if (ok !== false) onClose();
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-5">
      <h3 className="font-semibold text-text">Reserve squad spots</h3>

      <Stepper
        label="Your team"
        hint={`${totalOwn === 1 ? 'Just you' : `You + ${totalOwn - 1} held`} · max ${maxOwn}`}
        value={totalOwn}
        min={1}
        max={maxOwn}
        onChange={setTotalOwn}
      />

      <Stepper
        label="Opponent team"
        hint={`${opponent === 0 ? 'No reservation' : `${opponent} held`} · max ${maxOpponent}`}
        value={opponent}
        min={0}
        max={maxOpponent}
        onChange={setOpponent}
      />

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" loading={saving} onClick={confirm}>Confirm</Button>
      </div>
    </div>
  );
}
