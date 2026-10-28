'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useCreateMatchForm } from '@/features/create/hooks/useCreateMatchForm';
import {
  StepDetails,
  StepSchedule,
  StepSettings,
  StepSport,
  WizardHeader,
} from '@/features/create/components';
import { LAST_STEP } from '@/features/create/lib/constants';

export default function CreateMatchPage() {
  const router = useRouter();
  const wizard = useCreateMatchForm();
  const { step } = wizard;

  return (
    <div className="max-w-xl mx-auto">
      <WizardHeader step={step} onBack={wizard.goBack} onClose={() => router.push('/')} />

      {step === 0 && (
        <StepSport
          sport={wizard.sport}
          teamSize={wizard.teamSize}
          teamSizes={wizard.teamSizes}
          maxPlayers={wizard.maxPlayers}
          onSelectSport={wizard.selectSport}
          onSelectTeamSize={wizard.selectTeamSize}
          onMaxPlayersChange={wizard.setMaxPlayers}
        />
      )}

      {step === 1 && <StepDetails form={wizard.form} sportLabel={wizard.sportConfig?.label} />}

      {step === 2 && (
        <StepSchedule
          date={wizard.scheduledDate}
          time={wizard.scheduledTime}
          duration={wizard.duration}
          onDateChange={wizard.setScheduledDate}
          onTimeChange={wizard.setScheduledTime}
          onDurationChange={wizard.setDuration}
          onFillTestMatch={wizard.fillTestMatch}
        />
      )}

      {step === 3 && (
        <StepSettings
          minRating={wizard.minRating}
          maxRating={wizard.maxRating}
          onMinRatingChange={wizard.setMinRating}
          onMaxRatingChange={wizard.setMaxRating}
          isPrivate={wizard.isPrivate}
          onPrivateChange={wizard.setIsPrivate}
          sportConfig={wizard.sportConfig}
          teamSize={wizard.teamSize}
          maxPlayers={wizard.maxPlayers}
          locationName={wizard.form.getValues('location_name')}
          date={wizard.scheduledDate}
          time={wizard.scheduledTime}
          duration={wizard.duration}
        />
      )}

      <div className="mt-8 pt-6 border-t border-border">
        {step < LAST_STEP ? (
          <Button onClick={wizard.goNext} size="lg" className="w-full">
            Continue →
          </Button>
        ) : (
          <Button onClick={wizard.submit} loading={wizard.loading} size="lg" className="w-full">
            Create Match
          </Button>
        )}
      </div>
    </div>
  );
}
