import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { SPORTS } from '@matchd/shared/constants/sports';
import { generateInviteCode, TimeoutError } from '@matchd/shared/lib/helpers';
import { SportType } from '@matchd/shared/enums';
import { matchService } from '@/services';
import { useAuthStore } from '@/stores/authStore';
import { createMatchSchema, CreateMatchFormData } from '../lib/schema';
import { DEFAULT_DURATION, LAST_STEP } from '../lib/constants';
import { parseDateTimeInputs, toDateTimeInputs, validateSchedule } from '../lib/dateTime';

/** All wizard state, step navigation and the final submit. */
export const useCreateMatchForm = () => {
  const router = useRouter();
  const { user } = useAuthStore();

  const [step, setStep] = useState(0);
  const [sport, setSport] = useState<SportType | null>(null);
  const [teamSize, setTeamSize] = useState(5);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [minRating, setMinRating] = useState('1');
  const [maxRating, setMaxRating] = useState('10');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateMatchFormData>({ resolver: zodResolver(createMatchSchema) });
  const { getValues, setValue, trigger } = form;

  const sportConfig = sport ? SPORTS[sport] : null;
  const teamSizes = sportConfig?.teamSizes ?? [5];

  /** Picking a sport resets team size and capacity to that sport's defaults. */
  const selectSport = (next: SportType) => {
    setSport(next);
    const [firstTeamSize] = SPORTS[next].teamSizes;
    setTeamSize(firstTeamSize);
    setMaxPlayers(firstTeamSize * 2);
  };

  const selectTeamSize = (size: number) => {
    setTeamSize(size);
    setMaxPlayers(size * 2);
  };

  /** Dev-only: schedules a match one minute out so it is past almost at once. */
  const fillTestMatch = () => {
    const soon = new Date();
    soon.setMinutes(soon.getMinutes() + 1);
    const { date, time } = toDateTimeInputs(soon);
    setScheduledDate(date);
    setScheduledTime(time);
    setDuration(1);
  };

  const goBack = () => setStep((s) => s - 1);

  const goNext = async () => {
    if (step === 0) {
      if (!sport) { toast.error('Please select a sport first'); return; }
      if (!getValues('title')) setValue('title', `${SPORTS[sport].label} Match`);
    }
    if (step === 1) {
      if (!(await trigger(['title', 'location_name']))) return;
    }
    if (step === 2) {
      const error = validateSchedule(scheduledDate, scheduledTime);
      if (error) { toast.error(error); return; }
    }
    setStep((s) => Math.min(s + 1, LAST_STEP));
  };

  const submit = form.handleSubmit(async (data) => {
    if (!user || !sport) return;

    const minR = parseFloat(minRating);
    const maxR = parseFloat(maxRating);
    if (isNaN(minR) || isNaN(maxR) || minR < 1 || maxR > 10 || minR > maxR) {
      toast.error('Invalid rating range. Use values between 1 and 10.');
      return;
    }

    const scheduled = parseDateTimeInputs(scheduledDate, scheduledTime);
    if (!scheduled) { toast.error('Invalid date or time'); return; }

    setLoading(true);
    try {
      const { data: match, error } = await matchService.createWithTeams({
        creator_id: user.id,
        sport,
        title: data.title,
        description: data.description ?? null,
        location_name: data.location_name,
        scheduled_at: scheduled.toISOString(),
        duration_minutes: duration,
        max_players: maxPlayers,
        team_size: teamSize,
        min_rating: minR,
        max_rating: maxR,
        is_private: isPrivate,
        invite_code: isPrivate ? generateInviteCode() : null,
      });

      if (error || !match) {
        toast.error('Could not create match. Please try again.');
        return;
      }

      toast.success('Match created!');
      router.push(`/matches/${match.id}`);
    } catch (err) {
      toast.error(
        err instanceof TimeoutError
          ? 'This is taking too long. Check your connection and try again.'
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  });

  return {
    form,
    step,
    loading,
    goBack,
    goNext,
    submit,

    sport,
    sportConfig,
    teamSize,
    teamSizes,
    maxPlayers,
    selectSport,
    selectTeamSize,
    setMaxPlayers,

    scheduledDate,
    setScheduledDate,
    scheduledTime,
    setScheduledTime,
    duration,
    setDuration,
    fillTestMatch,

    minRating,
    setMinRating,
    maxRating,
    setMaxRating,
    isPrivate,
    setIsPrivate,
  };
};

export type CreateMatchForm = ReturnType<typeof useCreateMatchForm>;
