'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { MoreVertical, Camera, Users, UserPlus, UserCircle2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useFriendStore } from '@/stores/friendStore';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase/client';
import { SPORTS } from '@/constants/sports';
import { getRatingColor } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { MatchCard } from '@/components/match/MatchCard';

function DefaultPersonAvatar() {
  return (
    <div className="w-24 h-24 rounded-full bg-surface-alt border-2 border-border flex items-center justify-center flex-shrink-0">
      <UserCircle2 className="w-14 h-14 text-text-muted" />
    </div>
  );
}

export default function ProfilePage() {
  const { user, profile: authProfile, fetchProfile } = useAuthStore();
  const { friends, fetchFriends } = useFriendStore();
  const { profile, ratings, matchHistory, loading, fetchProfile: fetchDetailedProfile } = useProfile();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [menuOpen, setMenuOpen]   = useState(false);
  const [editOpen, setEditOpen]   = useState(false);
  const [fullName, setFullName]   = useState('');
  const [username, setUsername]   = useState('');
  const [bio, setBio]             = useState('');
  const [location, setLocation]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchDetailedProfile(user.id);
      fetchFriends(user.id);
    }
  }, [user?.id, fetchDetailedProfile, fetchFriends]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setUsername(profile.username ?? '');
      setBio(profile.bio ?? '');
      setLocation(profile.location ?? '');
    }
  }, [profile]);

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploading(true);
    const { data: files } = await supabase.storage.from('avatars').list(user.id);
    if (files?.length) {
      await supabase.storage.from('avatars').remove(files.map(f => `${user.id}/${f.name}`));
    }
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
    await Promise.all([fetchProfile(user.id), fetchDetailedProfile(user.id)]);
    toast.success('Photo removed');
    setUploading(false);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }

    setUploading(true);
    const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadError) { toast.error('Upload failed: ' + uploadError.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) { toast.error('Failed to save photo'); setUploading(false); return; }

    await Promise.all([fetchProfile(user.id), fetchDetailedProfile(user.id)]);
    toast.success('Photo updated!');
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        username: username.trim() || profile.username,
        bio: bio.trim() || null,
        location: location.trim() || null,
      })
      .eq('id', user.id);

    if (error?.code === '23505') {
      toast.error('Username already taken');
    } else if (error) {
      toast.error('Failed to save profile');
    } else {
      toast.success('Profile updated');
      await Promise.all([fetchProfile(user.id), fetchDetailedProfile(user.id)]);
      setEditOpen(false);
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

      {/* Hero card */}
      <div className="bg-surface border border-border rounded-2xl p-6 relative">
        {/* 3-dots menu */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-1.5 rounded-lg hover:bg-surface-alt transition-colors text-text-muted hover:text-text"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-50 w-44 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
                <button
                  onClick={() => { setEditOpen(true); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-text hover:bg-surface-alt transition-colors"
                >
                  Edit Profile
                </button>
                {profile.avatar_url && (
                  <button
                    onClick={() => { handleRemoveAvatar(); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-error hover:bg-surface-alt transition-colors"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Centered content */}
        <div className="flex flex-col items-center gap-3 pt-2 pb-2">
          {/* Avatar with upload overlay */}
          <div
            className="relative cursor-pointer group"
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            {profile.avatar_url
              ? <Avatar src={profile.avatar_url} size="2xl" />
              : <DefaultPersonAvatar />
            }
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading
                ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <Camera className="w-6 h-6 text-white" />
              }
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
          />

          {/* Name + handle + bio */}
          <div className="text-center">
            <h1 className="font-heading font-bold text-2xl text-text">
              {profile.full_name ?? profile.username}
            </h1>
            <p className="text-text-muted text-sm">@{profile.username}</p>
            {(profile.location || profile.bio) && (
              <p className="text-text-muted text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                {[profile.location && `📍 ${profile.location}`, profile.bio].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          {/* Friend action buttons */}
          <div className="flex gap-3 mt-1">
            <Link href="/friends">
              <Button variant="secondary" size="sm">
                <Users className="w-4 h-4" />
                Friends{friends.length > 0 ? ` (${friends.length})` : ''}
              </Button>
            </Link>
            <Link href="/friends/invite">
              <Button variant="secondary" size="sm">
                <UserPlus className="w-4 h-4" />
                Invite Friends
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Levels */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <h2 className="font-heading font-bold text-lg text-text mb-4">Levels</h2>
        {ratings.length === 0 ? (
          <p className="text-text-muted text-sm">No sports played yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {ratings.map(r => {
              const sport = SPORTS[r.sport];
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-surface-alt rounded-xl">
                  <span className="text-2xl leading-none">{sport?.emoji ?? '🏅'}</span>
                  <span className="flex-1 text-sm font-medium text-text">{sport?.label ?? r.sport}</span>
                  {/* Placeholder — replace with level badge when level system is implemented */}
                  <span className="text-text-muted text-sm font-mono px-2 py-0.5 rounded-lg bg-surface border border-border">—</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ratings */}
      {ratings.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-heading font-bold text-lg text-text mb-4">Ratings</h2>
          <div className="flex flex-col gap-4">
            {ratings.map(r => {
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

      {/* Recent Matches */}
      {matchHistory.length > 0 && (
        <div>
          <h2 className="font-heading font-bold text-lg text-text mb-4">Recent Matches</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {matchHistory.slice(0, 4).map(m => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      )}

      {/* Edit Profile modal */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={e => { if (e.target === e.currentTarget) setEditOpen(false); }}
        >
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto flex flex-col gap-4">
            <h2 className="font-heading font-bold text-lg text-text">Edit Profile</h2>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-text-muted mb-1 block">Full Name</label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-text text-sm placeholder:text-text-muted focus:outline-none focus:border-brand transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">@</span>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="username"
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-background border border-border text-text text-sm placeholder:text-text-muted focus:outline-none focus:border-brand transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell people about yourself"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-text text-sm placeholder:text-text-muted focus:outline-none focus:border-brand resize-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Location</label>
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="City"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-text text-sm placeholder:text-text-muted focus:outline-none focus:border-brand transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button className="flex-1" loading={saving} onClick={handleSave}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
