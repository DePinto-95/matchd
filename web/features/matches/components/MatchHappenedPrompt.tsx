import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface MatchHappenedPromptProps {
  onConfirm: () => void;
  onDeny: () => void;
}

/**
 * Shown to the creator once the scheduled time has passed but the match is
 * still Open — nothing else can move it forward until they answer.
 */
export function MatchHappenedPrompt({ onConfirm, onDeny }: MatchHappenedPromptProps) {
  return (
    <div className="bg-surface border border-brand/30 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
          <HelpCircle className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h2 className="font-heading font-bold text-base text-text">Did this match happen?</h2>
          <p className="text-text-muted text-xs mt-0.5">
            The scheduled time has passed. Let us know so players can rate and report the result.
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onDeny}>
          No, it didn&apos;t
        </Button>
        <Button className="flex-1" onClick={onConfirm}>
          Yes, it happened
        </Button>
      </div>
    </div>
  );
}
