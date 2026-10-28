import { toast } from 'sonner';
import { createFriendStore } from '@matchd/shared/stores/friendStore';
import { supabase } from '@/lib/supabase/client';

export const useFriendStore = createFriendStore(supabase, {
  onError: (message) => toast.error(message),
  onSuccess: (message) => toast.success(message),
});
