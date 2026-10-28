import type { SupabaseClient } from '@supabase/supabase-js';
import { Squad } from '../types';

export const createSquadService = (supabase: SupabaseClient) => ({
  getById: async (id: string): Promise<Squad | null> => {
    const { data } = await supabase
      .from('squads')
      .select('*, squad_members(*, profiles(*))')
      .eq('id', id)
      .single();
    return data ?? null;
  },
});

export type SquadService = ReturnType<typeof createSquadService>;
