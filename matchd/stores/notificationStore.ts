import { createNotificationStore } from '@matchd/shared/stores/notificationStore';
import { supabase } from '@/lib/supabase';

export const useNotificationStore = createNotificationStore(supabase);
