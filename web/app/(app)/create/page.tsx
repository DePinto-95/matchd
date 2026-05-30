'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ChevronLeft, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { SPORTS, SPORT_LIST } from '@/constants/sports';
import { generateInviteCode } from '@/lib/helpers';
import { SportType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(60),
  location_name: z.string().min(3, 'Please enter the match location'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const STEP_LABELS = ['Sport', 'Details', 'Date & Time', 'Settings'];
const DURATIONS = [45, 60, 75, 90, 120];

export default function CreateMatchPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [step, setStep] = useState(0);
  const [sport, setSport] = useState<SportType | null>(null);
  const [teamSize, setTeamSize] = useState(5);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [minRating, setMinRating] = useState('1');
  const [maxRating, setMaxRating] = useState('10');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, getValues, trigger, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const teamSizes = sport ? SPORTS[sport].teamSizes : [5];

  const formatDateInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let result = '';
    for (let i = 0; i < digits.length; i++) {
      if (i === 2 || i === 4) result += '/';
      result += digits[i];
    }
    return result;
  };

  const formatTimeInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  };

  const parseDateTimeInputs = () => {
    const dateParts = scheduledDate.split('/');
    const timeParts = scheduledTime.split(':');
    if (dateParts.length !== 3 || timeParts.length !== 2) return null;
    const [day, month, year] = dateParts.map(Number);
    const [hours, minutes] = timeParts.map(Number);
    const d = new Date(year, month - 1, day, hours, minutes);
    if (isNaN(d.getTime()) || d.getDate() !== day || d.getMonth() !== month - 1) return null;
    return d;
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!sport) { toast.error('Please select a sport first'); return; }
      if (!getValues('title')) setValue('title', `${SPORTS[sport].label} Match`);
    }
    if (step === 1) {
      const valid = await trigger(['title', 'location_name']);
      if (!valid) return;
    }
    if (step === 2) {
      if (!scheduledDate || !scheduledTime) { toast.error('Please enter a date and time'); return; }
      if (scheduledDate.length !== 10) { toast.error('Enter date as DD/MM/YYYY'); return; }
      if (scheduledTime.length !== 5) { toast.error('Enter time as HH:MM'); return; }
      const timeParts = scheduledTime.split(':').map(Number);
      if (timeParts[0] > 23 || timeParts[1] > 59) { toast.error('Invalid time'); return; }
      const dt = parseDateTimeInputs();
      if (!dt) { toast.error('Invalid date or time'); return; }
      const now = new Date();
      if (dt <= now) { toast.error('Match must be scheduled in the future'); return; }
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      if (dt > oneYearFromNow) { toast.error('Match cannot be more than 1 year in the future'); return; }
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const onSubmit = async (data: FormData) => {
    if (!user || !sport) return;

    const minR = parseFloat(minRating);
    const maxR = parseFloat(maxRating);
    if (isNaN(minR) || isNaN(maxR) || minR < 1 || maxR > 10 || minR > maxR) {
      toast.error('Invalid rating range. Use values between 1 and 10.');
      return;
    }

    const scheduledAt = parseDateTimeInputs()!.toISOString();

    setLoading(true);
    const inviteCode = isPrivate ? generateInviteCode() : null;

    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        creator_id: user.id,
        sport,
        title: data.title,
        description: data.description ?? null,
        location_name: data.location_name,
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        max_players: maxPlayers,
        team_size: teamSize,
        min_rating: minR,
        max_rating: maxR,
        is_private: isPrivate,
        invite_code: inviteCode,
        status: 'open',
      })
      .select()
      .single();

    if (error || !match) {
      toast.error('Could not create match. Please try again.');
      setLoading(false);
      return;
    }

    await supabase.from('match_teams').insert([
      { match_id: match.id, side: 'home', name: 'Home' },
      { match_id: match.id, side: 'away', name: 'Away' },
    ]);

    const { data: teams } = await supabase
      .from('match_teams').select('id, side').eq('match_id', match.id);

    const homeTeam = teams?.find((t: { side: string }) => t.side === 'home');
    if (homeTeam) {
      await supabase.from('match_participants').insert({
        match_id: match.id,
        player_id: user.id,
        team_id: homeTeam.id,
        status: 'confirmed',
      });
    }

    toast.success('Match created!');
    router.push(`/matches/${match.id}`);
  };

  const sportConfig = sport ? SPORTS[sport] : null;

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        {step > 0 ? (
          <button onClick={() => setStep((s) => s - 1)} className="p-2 rounded-xl hover:bg-surface-alt transition-colors">
            <ChevronLeft className="w-5 h-5 text-text" />
          </button>
        ) : (
          <button onClick={() => router.push('/')} className="p-2 rounded-xl hover:bg-surface-alt transition-colors">
            <X className="w-5 h-5 text-text" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="font-heading font-bold text-xl text-text">Create Match</h1>
          <p className="text-xs text-text-muted">Step {step + 1} of 4 — {STEP_LABELS[step]}</p>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5 items-center">
          {STEP_LABELS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i <= step ? 'bg-brand' : 'bg-border'} ${i === step ? 'w-5' : 'w-1.5'}`}
            />
          ))}
        </div>
      </div>

      {/* Step 0: Sport selection */}
      {step === 0 && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SPORT_LIST.map((s) => {
              const active = sport === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSport(s.id);
                    setTeamSize(s.teamSizes[0]);
                    setMaxPlayers(s.teamSizes[0] * 2);
                  }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                    ${active ? 'border-brand bg-brand/10' : 'border-border hover:border-text-muted bg-surface'}`}
                >
                  <span className="text-3xl">{s.emoji}</span>
                  <span className={`text-sm font-medium ${active ? 'text-brand' : 'text-text'}`}>{s.label}</span>
                </button>
              );
            })}
          </div>

          {sport && (
            <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-5">
              {/* Team size */}
              <div>
                <label className="text-sm font-medium text-text-muted mb-2 block">Team Size</label>
                <div className="flex gap-2 flex-wrap">
                  {teamSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => { setTeamSize(size); setMaxPlayers(size * 2); }}
                      className={`px-4 py-2 rounded-xl font-semibold text-sm border-2 transition-all
                        ${teamSize === size ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-muted hover:border-text-muted'}`}
                    >
                      {size}v{size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max players */}
              <div>
                <label className="text-sm font-medium text-text-muted mb-2 block">Max Players</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setMaxPlayers((p) => Math.max(2, p - 1))}
                    className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-brand text-lg hover:bg-surface-alt transition-colors"
                  >
                    −
                  </button>
                  <span className="text-2xl font-bold text-text w-10 text-center">{maxPlayers}</span>
                  <button
                    onClick={() => setMaxPlayers((p) => p + 1)}
                    className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-brand text-lg hover:bg-surface-alt transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <Input
            label="Match Title *"
            placeholder={`${sportConfig?.label ?? 'Match'} at the park`}
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
      )}

      {/* Step 2: Date & Time */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <Input
            label="Date *"
            type="text"
            placeholder="DD/MM/YYYY"
            maxLength={10}
            value={scheduledDate}
            onChange={(e) => setScheduledDate(formatDateInput(e.target.value))}
          />
          <Input
            label="Time * (24h)"
            type="text"
            placeholder="HH:MM"
            maxLength={5}
            value={scheduledTime}
            onChange={(e) => setScheduledTime(formatTimeInput(e.target.value))}
          />
          <div>
            <label className="text-sm font-medium text-text-muted mb-2 block">Duration</label>
            <div className="flex gap-2 flex-wrap">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm border-2 transition-all
                    ${duration === d ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-muted hover:border-text-muted'}`}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Settings */}
      {step === 3 && (
        <div className="flex flex-col gap-6">
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-semibold text-text mb-1">Rating Range</h3>
            <p className="text-text-muted text-sm mb-4">Only players with a rating in this range can join.</p>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Min Rating"
                type="number"
                min="1" max="10" step="0.1"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
              />
              <Input
                label="Max Rating"
                type="number"
                min="1" max="10" step="0.1"
                value={maxRating}
                onChange={(e) => setMaxRating(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-text">Invite Only</p>
              <p className="text-text-muted text-sm mt-0.5">Only players with the invite link can join</p>
            </div>
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={`relative w-12 h-6 rounded-full transition-colors ${isPrivate ? 'bg-brand' : 'bg-border'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isPrivate ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {/* Summary */}
          {sport && (
            <div className="bg-surface-alt border border-border rounded-xl p-5 flex flex-col gap-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Match Summary{isPrivate ? ' · 🔒 Invite Only' : ''}
              </p>
              <p className="text-text text-sm">{SPORTS[sport].emoji} {SPORTS[sport].label} · {teamSize}v{teamSize} · {maxPlayers} players max</p>
              <p className="text-text text-sm">📍 {getValues('location_name') || '—'}</p>
              <p className="text-text text-sm">📅 {scheduledDate} at {scheduledTime}</p>
              <p className="text-text text-sm">⏱ {duration} minutes</p>
              <p className="text-text text-sm">⭐ Rating {minRating}–{maxRating}</p>
            </div>
          )}
        </div>
      )}

      {/* Footer action */}
      <div className="mt-8 pt-6 border-t border-border">
        {step < 3 ? (
          <Button onClick={handleNext} size="lg" className="w-full">
            Continue →
          </Button>
        ) : (
          <Button onClick={handleSubmit(onSubmit)} loading={loading} size="lg" className="w-full">
            Create Match
          </Button>
        )}
      </div>
    </div>
  );
}
