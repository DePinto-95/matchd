'use client';

import { useState } from 'react';
import { Profile } from '@matchd/shared/types';
import { Button } from '@/components/ui/Button';
import { ProfileFields } from '@matchd/shared/services';

interface EditProfileModalProps {
  profile: Profile;
  saving: boolean;
  onSave: (fields: ProfileFields) => Promise<boolean>;
  onClose: () => void;
}

const inputClass = 'w-full px-3 py-2 rounded-xl bg-background border border-border text-text text-sm placeholder:text-text-muted focus:outline-none focus:border-brand transition-colors';

export function EditProfileModal({ profile, saving, onSave, onClose }: EditProfileModalProps) {
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [username, setUsername] = useState(profile.username ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [location, setLocation] = useState(profile.location ?? '');

  const save = async () => {
    const saved = await onSave({
      full_name: fullName.trim() || null,
      username: username.trim() || profile.username,
      bio: bio.trim() || null,
      location: location.trim() || null,
    });
    if (saved) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto flex flex-col gap-4">
        <h2 className="font-heading font-bold text-lg text-text">Edit Profile</h2>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className={`${inputClass} pl-7`}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people about yourself"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={saving} onClick={save}>Save</Button>
        </div>
      </div>
    </div>
  );
}
