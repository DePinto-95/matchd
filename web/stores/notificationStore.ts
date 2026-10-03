import { createNotificationStore } from '@matchd/shared/stores/notificationStore';
import { supabase } from '@/lib/supabase/client';

export const useNotificationStore = createNotificationStore(supabase);
