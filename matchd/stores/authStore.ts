import { createAuthStore } from '@matchd/shared/stores/authStore';
import { supabase } from '@/lib/supabase';

export const useAuthStore = createAuthStore(supabase);
