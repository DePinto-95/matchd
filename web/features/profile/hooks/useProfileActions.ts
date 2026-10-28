import { useState } from 'react';
import { toast } from 'sonner';
import { ProfileFields } from '@matchd/shared/services';
import { profileService, storageService } from '@/services';

/** Postgres unique-violation — in practice, the username is taken. */
const UNIQUE_VIOLATION = '23505';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

interface UseProfileActionsOptions {
  userId: string | undefined;
  /** Re-reads the profile everywhere it is shown after a change. */
  onChanged: () => Promise<void>;
}

/** Avatar upload/removal and profile field saving. */
export const useProfileActions = ({ userId, onChanged }: UseProfileActionsOptions) => {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const removeAvatar = async () => {
    if (!userId) return;
    setUploading(true);
    await storageService.removeAvatars(userId);
    await profileService.setAvatarUrl(userId, null);
    await onChanged();
    toast.success('Photo removed');
    setUploading(false);
  };

  const uploadAvatar = async (file: File) => {
    if (!userId) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > MAX_AVATAR_BYTES) { toast.error('Image must be under 5 MB'); return; }

    setUploading(true);
    const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';

    const { data: publicUrl, error } = await storageService.uploadAvatar(userId, file, ext);
    if (error || !publicUrl) {
      toast.error('Upload failed: ' + error?.message);
      setUploading(false);
      return;
    }

    const { error: updateError } = await profileService.setAvatarUrl(userId, publicUrl);
    if (updateError) { toast.error('Failed to save photo'); setUploading(false); return; }

    await onChanged();
    toast.success('Photo updated!');
    setUploading(false);
  };

  /** Returns true when saved, so the modal knows whether to close. */
  const saveProfile = async (fields: ProfileFields): Promise<boolean> => {
    if (!userId) return false;
    setSaving(true);

    const { error } = await profileService.update(userId, fields);
    setSaving(false);

    if (error?.code === UNIQUE_VIOLATION) {
      toast.error('Username already taken');
      return false;
    }
    if (error) {
      toast.error('Failed to save profile');
      return false;
    }

    toast.success('Profile updated');
    await onChanged();
    return true;
  };

  return { saving, uploading, removeAvatar, uploadAvatar, saveProfile };
};
