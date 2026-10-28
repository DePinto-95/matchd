/**
 * The data-access layer: the only place in the codebase allowed to call
 * `supabase.from()`, `.rpc()`, `.storage` or `.auth`.
 *
 * Each service is a factory taking a Supabase client, so the same code serves
 * the web app and the mobile app, which build their clients differently. Each
 * app wires them up once (see `web/services/index.ts`).
 */
export * from './types';

export { createAuthService, type AuthService } from './authService';
export { createProfileService, type ProfileService, type ProfileFields } from './profileService';
export {
  createMatchService,
  type MatchService,
  type MatchListFilters,
  type NewMatch,
} from './matchService';
export {
  createParticipantService,
  type ParticipantService,
  type JoinArgs,
} from './participantService';
export { createMatchResultService, type MatchResultService } from './matchResultService';
export { createRatingService, type RatingService, DEFAULT_RATING } from './ratingService';
export { createFriendService, type FriendService, type FriendLists } from './friendService';
export {
  createNotificationService,
  type NotificationService,
  type NewNotification,
} from './notificationService';
export { createReportService, type ReportService, DUPLICATE_REPORT_CODE } from './reportService';
export { createStorageService, type StorageService } from './storageService';
export { createVenueService, type VenueService } from './venueService';
export { createSquadService, type SquadService } from './squadService';
export { createRealtimeService, type RealtimeService } from './realtimeService';
