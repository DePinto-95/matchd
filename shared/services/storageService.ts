import type { SupabaseClient } from '@supabase/supabase-js';
import { DataResult, MutationResult } from './types';

const AVATAR_BUCKET = 'avatars';

/** Storage policies key off the first path segment being the user's own id. */
const avatarPath = (userId: string, ext: string) => `${userId}/avatar.${ext}`;

export const createStorageService = (supabase: SupabaseClient) => ({
  /** Uploads (or replaces) an avatar and returns its public URL. */
  uploadAvatar: async (
    userId: string,
    file: File,
    ext: string
  ): Promise<DataResult<string>> => {
    const path = avatarPath(userId, ext);
    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: true });
    if (error) return { data: null, error };

    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    return { data: publicUrl, error: null };
  },

  /**
   * Removes every file in the user's avatar folder. The extension varies by
   * upload, so the folder is listed rather than guessed at.
   */
  removeAvatars: async (userId: string): Promise<MutationResult> => {
    const { data: files } = await supabase.storage.from(AVATAR_BUCKET).list(userId);
    if (!files?.length) return { error: null };

    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove(files.map((f) => `${userId}/${f.name}`));
    return { error };
  },
});

export type StorageService = ReturnType<typeof createStorageService>;
