/**
 * Every service, bound to the browser Supabase client.
 *
 * Import these anywhere in the app instead of touching Supabase directly:
 *
 *   import { matchService } from '@/services';
 *   const match = await matchService.getById(id);
 *
 * The service implementations live in `@matchd/shared/services` so the mobile
 * app can reuse them with its own client.
 */
import {
  createAuthService,
  createFriendService,
  createMatchResultService,
  createMatchService,
  createNotificationService,
  createParticipantService,
  createProfileService,
  createRatingService,
  createRealtimeService,
  createReportService,
  createSquadService,
  createStorageService,
  createVenueService,
} from '@matchd/shared/services';
import { supabase } from '@/lib/supabase/client';

export const authService = createAuthService(supabase);
export const profileService = createProfileService(supabase);
export const matchService = createMatchService(supabase);
export const participantService = createParticipantService(supabase);
export const matchResultService = createMatchResultService(supabase);
export const ratingService = createRatingService(supabase);
export const friendService = createFriendService(supabase);
export const notificationService = createNotificationService(supabase);
export const reportService = createReportService(supabase);
export const storageService = createStorageService(supabase);
export const venueService = createVenueService(supabase);
export const squadService = createSquadService(supabase);
export const realtimeService = createRealtimeService(supabase);
