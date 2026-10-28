/**
 * Relationship between the current user and another player, derived client-side
 * from `friendships` rows. Drives which friend action button to show.
 * Client-only — not stored in the database.
 */
export enum FriendRelationKind {
  None = 'none',
  PendingSent = 'pending_sent',
  PendingReceived = 'pending_received',
  Friends = 'friends',
}
