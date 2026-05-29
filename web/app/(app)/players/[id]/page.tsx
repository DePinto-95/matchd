'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { SPORTS } from '@/constants/sports';
import { getRatingColor } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { MatchCard } from '@/components/match/MatchCard';

export default function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { profile, ratings, matchHistory, loading, fetchProfile } = useProfile();

  useEffect(() => {
    fetchProfile(id);
  }, [id, fetchProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-32">
        <p className="text-text-muted">Player not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-muted hover:text-text transition-colors w-fit">
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </button>

      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <Avatar src={profile.avatar_url} name={profile.full_name ?? profile.username} size="xl" />
          <div>
            <h1 className="font-heading font-bold text-xl text-text">{profile.full_name ?? profile.username}</h1>
            <p className="text-text-muted text-sm">@{profile.username}</p>
            {profile.location && <p className="text-text-muted text-sm mt-1">📍 {profile.location}</p>}
            <Badge variant="brand" className="mt-2 capitalize">{profile.account_type}</Badge>
          </div>
        </div>
        {profile.bio && <p className="mt-4 text-text-muted text-sm leading-relaxed">{profile.bio}</p>}
      </div>

      {ratings.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-heading font-bold text-lg text-text mb-4">Ratings</h2>
          <div className="flex flex-col gap-4">
            {ratings.map((r) => {
              const sport = SPORTS[r.sport];
              const color = getRatingColor(r.rating);
              return (
                <div key={r.id} className="flex items-center gap-3">
                  <span className="text-xl">{sport?.emoji ?? '🏅'}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-text">{sport?.label ?? r.sport}</span>
                      <span className="text-sm font-bold" style={{ color }}>{r.rating.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(r.rating / 10) * 100}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{r.total_matches} matches · {r.wins} wins</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {matchHistory.length > 0 && (
        <div>
          <h2 className="font-heading font-bold text-lg text-text mb-4">Recent Matches</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {matchHistory.slice(0, 4).map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
