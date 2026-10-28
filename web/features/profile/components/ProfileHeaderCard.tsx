'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, MoreVertical, UserCircle2, UserPlus, Users } from 'lucide-react';
import { Profile } from '@matchd/shared/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

interface ProfileHeaderCardProps {
  profile: Profile;
  friendCount: number;
  uploading: boolean;
  onAvatarSelected: (file: File) => void;
  onRemoveAvatar: () => void;
  onEdit: () => void;
}

function DefaultPersonAvatar() {
  return (
    <div className="w-24 h-24 rounded-full bg-surface-alt border-2 border-border flex items-center justify-center flex-shrink-0">
      <UserCircle2 className="w-14 h-14 text-text-muted" />
    </div>
  );
}

/** Avatar, name, bio and the friends shortcuts, plus the overflow menu. */
export function ProfileHeaderCard({
  profile,
  friendCount,
  uploading,
  onAvatarSelected,
  onRemoveAvatar,
  onEdit,
}: ProfileHeaderCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 relative">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="p-1.5 rounded-lg hover:bg-surface-alt transition-colors text-text-muted hover:text-text"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
        {menuOpen && (
          <>
            {/* Click-away backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-8 z-50 w-44 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
              <button
                onClick={() => { onEdit(); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-text hover:bg-surface-alt transition-colors"
              >
                Edit Profile
              </button>
              {profile.avatar_url && (
                <button
                  onClick={() => { onRemoveAvatar(); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-error hover:bg-surface-alt transition-colors"
                >
                  Remove Photo
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 pt-2 pb-2">
        <div
          className="relative cursor-pointer group"
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          {profile.avatar_url ? (
            <Avatar src={profile.avatar_url} size="2xl" />
          ) : (
            <DefaultPersonAvatar />
          )}
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-white" />
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onAvatarSelected(e.target.files[0])}
        />

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

        <div className="flex gap-3 mt-1">
          <Link href="/friends">
            <Button variant="secondary" size="sm">
              <Users className="w-4 h-4" />
              Friends{friendCount > 0 ? ` (${friendCount})` : ''}
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
  );
}
