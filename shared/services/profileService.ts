import type { SupabaseClient } from '@supabase/supabase-js';
import { AccountType } from '../enums';
import { Profile } from '../types';
import { MutationResult } from './types';

export interface ProfileFields {
  full_name: string | null;
  username: string;
  bio: string | null;
  location: string | null;
}

export const createProfileService = (supabase: SupabaseClient) => ({
  getById: async (id: string): Promise<Profile | null> => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    return data ?? null;
  },

  /** Used at registration, where the row may not exist yet. */
  upsert: async (
    id: string,
    username: string,
    accountType: AccountType
  ): Promise<MutationResult> => {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id, username, account_type: accountType });
    return { error };
  },

  /** Fallback when a signed-in user somehow has no profile row yet. */
  createDefault: async (id: string, username: string): Promise<Profile | null> => {
    const { data } = await supabase
      .from('profiles')
      .upsert({ id, account_type: AccountType.Player, username })
      .select()
      .single();
    return data ?? null;
  },

  update: async (id: string, fields: Partial<ProfileFields>): Promise<MutationResult> => {
    const { error } = await supabase.from('profiles').update(fields).eq('id', id);
    return { error };
  },

  setAvatarUrl: async (id: string, avatarUrl: string | null): Promise<MutationResult> => {
    const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', id);
    return { error };
  },

  /**
   * Free-text search over username and full name.
   * NOTE (MD-05): `term` is interpolated raw into a PostgREST `.or()` filter, so a
   * term containing , ( ) or . corrupts the expression and the query errors.
   * Escaping it here fixes every caller at once.
   */
  search: async (term: string, excludeId: string): Promise<Profile[]> => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
      .neq('id', excludeId)
      .limit(20);
    return (data as Profile[]) ?? [];
  },
});

export type ProfileService = ReturnType<typeof createProfileService>;
