import { toast } from 'sonner';
import { createMatchStore } from '@matchd/shared/stores/matchStore';
import { supabase } from '@/lib/supabase/client';

export const useMatchStore = createMatchStore(supabase, {
  onError: (message) => toast.error(message),
});
