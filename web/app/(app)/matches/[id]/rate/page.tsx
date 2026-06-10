'use client';

import { useEffect, useState, useCallback, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Star, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useMatchStore } from '@/stores/matchStore';
import { useRatings } from '@/hooks/useRatings';
import { Match, MatchParticipant } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function RatePlayersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const { fetchMatchById } = useMatchStore();
  const [match, setMatch] = useState<Match | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [rated, setRated] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [initialVisibleIds, setInitialVisibleIds] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [submittingDone, setSubmittingDone] = useState(false);

  const loadMatch = useCallback(async () => {
    const data = await fetchMatchById(id);
    setMatch(data);
  }, [id, fetchMatchById]);

  useEffect(() => { loadMatch(); }, [loadMatch]);

  const { submitRating, submitting } = useRatings(id, match?.sport ?? '');

  const myRow = match?.match_participants?.find((p) => p.player_id === user?.id);

  const allOpponents = useMemo(() => {
    return (match?.match_participants ?? []).filter(
      (p) => p.player_id !== user?.id && p.status === 'confirmed'
    );
  }, [match, user?.id]);

  // Resume: load any ratings this user already submitted for this match
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('match_ratings')
      .select('rated_player_id, score')
      .eq('match_id', id)
      .eq('rater_id', user.id)
      .then(({ data }) => {
        if (!data?.length) return;
        setScores((prev) => {
          const loaded: Record<string, number> = {};
          data.forEach((r) => { loaded[r.rated_player_id] = r.score; });
          return { ...loaded, ...prev };
        });
        setRated(new Set(data.map((r) => r.rated_player_id)));
      });
  }, [user?.id, id]);

  // Fix the initial visible set once opponents are known
  useEffect(() => {
    if (allOpponents.length > 0 && initialVisibleIds.size === 0) {
      const count = allOpponents.length <= 6 ? allOpponents.length : 4;
      setInitialVisibleIds(new Set(allOpponents.slice(0, count).map((p) => p.player_id)));
    }
  }, [allOpponents]);

  const visiblePlayers = useMemo(() => {
    const base = showAll
      ? allOpponents
      : allOpponents.filter((p) => initialVisibleIds.has(p.player_id));
    return base.filter((p) => !skipped.has(p.player_id));
  }, [allOpponents, initialVisibleIds, skipped, showAll]);

  const hiddenCount = allOpponents.filter(
    (p) => !initialVisibleIds.has(p.player_id) && !skipped.has(p.player_id)
  ).length;

  const canDone =
    initialVisibleIds.size > 0 &&
    [...initialVisibleIds].every((pid) => rated.has(pid) || skipped.has(pid));

  const handleRate = async (p: MatchParticipant) => {
    if (!user) return;
    const score = scores[p.player_id];
    if (!score || score < 1 || score > 10) {
      toast.error('Please enter a score between 1 and 10');
      return;
    }
    const ok = await submitRating(user.id, p.player_id, score);
    if (ok) {
      setRated((prev) => new Set([...prev, p.player_id]));
    } else {
      toast.error('Failed to submit rating');
    }
  };

  const handleDone = async () => {
    if (!user) return;
    setSubmittingDone(true);
    await supabase
      .from('match_participants')
      .update({ rating_submitted: true })
      .eq('match_id', id)
      .eq('player_id', user.id);
    setSubmittingDone(false);
    router.push('/');
  };

  if (!match) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (myRow?.rating_submitted) {
    return (
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-text-muted hover:text-text transition-colors w-fit">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <CheckCircle className="w-12 h-12 text-success" />
          <h2 className="font-heading font-bold text-xl text-text">Ratings submitted</h2>
          <p className="text-text-muted text-sm">You've already rated your players for this match.</p>
          <Button onClick={() => router.push('/')}>Back to home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-muted hover:text-text transition-colors w-fit">
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </button>

      <div>
        <h1 className="font-heading font-bold text-2xl text-text">Rate Players</h1>
        <p className="text-text-muted text-sm mt-1">{match.title}</p>
      </div>

      {allOpponents.length === 0 ? (
        <div className="text-center py-20">
          <Star className="w-10 h-10 text-border mx-auto mb-3" />
          <p className="text-text-muted text-sm">No players to rate</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visiblePlayers.map((p) => {
            const isRated = rated.has(p.player_id);
            return (
              <div
                key={p.id}
                className={`border rounded-xl p-4 flex items-center gap-4 transition-colors ${
                  isRated ? 'bg-success/5 border-success/30' : 'bg-surface border-border'
                }`}
              >
                <Avatar src={p.profiles?.avatar_url} name={p.profiles?.username} size="md" />
                <div className="flex-1">
                  <p className="font-medium text-text">{p.profiles?.username ?? 'Player'}</p>
                  {isRated && <p className="text-xs text-success mt-0.5">Rated ✓</p>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1" max="10" step="0.1"
                    placeholder="Score"
                    value={scores[p.player_id] ?? ''}
                    onChange={(e) => setScores((prev) => ({ ...prev, [p.player_id]: parseFloat(e.target.value) }))}
                    className={`w-20 px-3 py-2 rounded-lg bg-surface-alt border text-text text-sm text-center focus:outline-none focus:border-brand ${
                      isRated ? 'border-success/50' : 'border-border'
                    }`}
                  />
                  <Button
                    size="sm"
                    loading={submitting}
                    variant={isRated ? 'secondary' : 'primary'}
                    onClick={() => handleRate(p)}
                  >
                    {isRated ? 'Update' : 'Rate'}
                  </Button>
                  {!isRated && (
                    <button
                      onClick={() => setSkipped((prev) => new Set([...prev, p.player_id]))}
                      className="text-xs text-text-muted hover:text-text transition-colors px-2 py-1.5"
                    >
                      Skip
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {!showAll && hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="text-sm text-brand hover:text-brand/80 transition-colors text-center py-2"
            >
              + {hiddenCount} more player{hiddenCount !== 1 ? 's' : ''} to rate
            </button>
          )}

          {canDone && (
            <Button loading={submittingDone} onClick={handleDone} className="w-full mt-2">
              Done
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
