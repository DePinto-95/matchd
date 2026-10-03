import { createMatchStore } from '@matchd/shared/stores/matchStore';
import { supabase } from '@/lib/supabase';

export const useMatchStore = createMatchStore(supabase);
