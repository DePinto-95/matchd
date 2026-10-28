import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { CreateMatchFormData } from '../lib/schema';

interface StepDetailsProps {
  form: UseFormReturn<CreateMatchFormData>;
  /** Used only for the title placeholder, e.g. "Padel at the park". */
  sportLabel: string | undefined;
}

export function StepDetails({ form, sportLabel }: StepDetailsProps) {
  const { register, formState: { errors } } = form;

  return (
    <div className="flex flex-col gap-5">
      <Input
        label="Match Title *"
        placeholder={`${sportLabel ?? 'Match'} at the park`}
        error={errors.title?.message}
        {...register('title')}
      />
      <Input
        label="Location *"
        placeholder="Stadium, park, court name..."
        error={errors.location_name?.message}
        {...register('location_name')}
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-muted">Description (optional)</label>
        <textarea
          className="w-full px-4 py-2.5 rounded-xl text-sm bg-surface-alt border border-border text-text placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors resize-none"
          rows={3}
          placeholder="Add details about the match..."
          {...register('description')}
        />
      </div>
    </div>
  );
}
