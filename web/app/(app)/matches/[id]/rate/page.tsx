'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Star } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useMatchStore } from '@/stores/matchStore';
import { useRatings } from '@/hooks/useRatings';
import { Match, MatchParticipant } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export default function RatePlayersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const { fetchMatchById } = useMatchStore();
  const [match, setMatch] = useState<Match | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});

  const loadMatch = useCallback(async () => {
    const data = await fetchMatchById(id);
    setMatch(data);
  }, [id, fetchMatchById]);

  useEffect(() => { loadMatch(); }, [loadMatch]);

  const { submitRating, submitting, hasRated } = useRatings(id, match?.sport ?? '');

  const opponents = (match?.match_participants ?? []).filter(
    (p) => p.player_id !== user?.id && p.status === 'confirmed'
  );

  const handleRate = async (p: MatchParticipant) => {
    if (!user) return;
    const score = scores[p.player_id];
    if (!score || score < 1 || score > 10) {
      toast.error('Please enter a score between 1 and 10');
      return;
    }
    const ok = await submitRating(user.id, p.player_id, score);
    if (ok) toast.success(`Rated ${p.profiles?.username ?? 'player'}`);
    else toast.error('Failed to submit rating');
  };

  if (!match) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
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

      {opponents.length === 0 ? (
        <div className="text-center py-20">
          <Star className="w-10 h-10 text-border mx-auto mb-3" />
          <p className="text-text-muted text-sm">No players to rate</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {opponents.map((p) => (
            <div key={p.id} className={`bg-surface border border-border rounded-xl p-4 flex items-center gap-4 ${hasRated(p.player_id) ? 'opacity-60' : ''}`}>
              <Avatar src={p.profiles?.avatar_url} name={p.profiles?.username} size="md" />
              <div className="flex-1">
                <p className="font-medium text-text">{p.profiles?.username ?? 'Player'}</p>
                {hasRated(p.player_id) && <p className="text-xs text-success mt-0.5">Rated ✓</p>}
              </div>
              {!hasRated(p.player_id) && (
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1" max="10" step="0.5"
                    placeholder="Score"
                    value={scores[p.player_id] ?? ''}
                    onChange={(e) => setScores((prev) => ({ ...prev, [p.player_id]: parseFloat(e.target.value) }))}
                    className="w-20 px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm text-center focus:outline-none focus:border-brand"
                  />
                  <Button size="sm" loading={submitting} onClick={() => handleRate(p)}>
                    Rate
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Button variant="ghost" onClick={() => router.push('/')} className="w-full">
        Done
      </Button>
    </div>
  );
}
