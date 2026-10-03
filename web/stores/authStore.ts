import { createAuthStore } from '@matchd/shared/stores/authStore';
import { supabase } from '@/lib/supabase/client';

export const useAuthStore = createAuthStore(supabase);
