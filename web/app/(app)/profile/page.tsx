'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Edit2, Check, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase/client';
import { SPORTS } from '@/constants/sports';
import { getRatingColor } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MatchCard } from '@/components/match/MatchCard';

export default function ProfilePage() {
  const { user, profile: authProfile, fetchProfile } = useAuthStore();
  const { profile, ratings, matchHistory, loading, fetchProfile: fetchDetailedProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) fetchDetailedProfile(user.id);
  }, [user?.id, fetchDetailedProfile]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setBio(profile.bio ?? '');
      setLocation(profile.location ?? '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName || null, bio: bio || null, location: location || null })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to save profile');
    } else {
      toast.success('Profile updated');
      fetchProfile(user.id);
      setEditing(false);
    }
    setSaving(false);
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Profile card */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <Avatar src={profile.avatar_url} name={profile.full_name ?? profile.username} size="xl" />
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-surface-alt border border-border text-text text-lg font-bold focus:outline-none focus:border-brand mb-2"
                placeholder="Full name"
              />
            ) : (
              <h1 className="font-heading font-bold text-xl text-text">
                {profile.full_name ?? profile.username}
              </h1>
            )}
            <p className="text-text-muted text-sm">@{profile.username}</p>
            <Badge variant="brand" className="mt-1 capitalize">{profile.account_type}</Badge>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="p-2 rounded-xl hover:bg-surface-alt transition-colors">
              <Edit2 className="w-4 h-4 text-text-muted" />
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="p-2 rounded-xl bg-brand/10 hover:bg-brand/20 transition-colors">
                <Check className="w-4 h-4 text-brand" />
              </button>
              <button onClick={() => setEditing(false)} className="p-2 rounded-xl hover:bg-surface-alt transition-colors">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-4 flex flex-col gap-3">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:border-brand resize-none"
              rows={2}
              placeholder="Bio"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:border-brand"
              placeholder="Location (city)"
            />
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-1">
            {profile.bio && <p className="text-text-muted text-sm leading-relaxed">{profile.bio}</p>}
            {profile.location && <p className="text-text-muted text-sm">📍 {profile.location}</p>}
          </div>
        )}
      </div>

      {/* Ratings per sport */}
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
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(r.rating / 10) * 100}%`, backgroundColor: color }}
                      />
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{r.total_matches} matches · {r.wins} wins</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Match history */}
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
