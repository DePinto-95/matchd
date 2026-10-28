/**
 * Standing of a player within a match they signed up for.
 * DB: `match_participants.status` (TEXT + CHECK).
 */
export enum ParticipantStatus {
  Confirmed = 'confirmed',
  Waitlist = 'waitlist',
  Cancelled = 'cancelled',
}
