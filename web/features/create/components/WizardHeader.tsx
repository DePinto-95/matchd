import { ChevronLeft, X } from 'lucide-react';
import { STEP_LABELS } from '../lib/constants';

interface WizardHeaderProps {
  step: number;
  onBack: () => void;
  onClose: () => void;
}

export function WizardHeader({ step, onBack, onClose }: WizardHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <button
        onClick={step > 0 ? onBack : onClose}
        className="p-2 rounded-xl hover:bg-surface-alt transition-colors"
      >
        {step > 0 ? (
          <ChevronLeft className="w-5 h-5 text-text" />
        ) : (
          <X className="w-5 h-5 text-text" />
        )}
      </button>

      <div className="flex-1">
        <h1 className="font-heading font-bold text-xl text-text">Create Match</h1>
        <p className="text-xs text-text-muted">
          Step {step + 1} of {STEP_LABELS.length} — {STEP_LABELS[step]}
        </p>
      </div>

      <div className="flex gap-1.5 items-center">
        {STEP_LABELS.map((label, i) => (
          <div
            key={label}
            className={`h-1.5 rounded-full transition-all ${i <= step ? 'bg-brand' : 'bg-border'} ${i === step ? 'w-5' : 'w-1.5'}`}
          />
        ))}
      </div>
    </div>
  );
}
