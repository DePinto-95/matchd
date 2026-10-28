/**
 * Kinds of in-app notification. Drives the icon and click target on the
 * notifications page, so every value needs a branch there.
 *
 * MatchCompleted and MatchHappenedCheck are inserted by DB functions
 * (`notify_match_completion`, `send_match_confirmation_check`), not by the client.
 *
 * DB: `notifications.type` (TEXT + CHECK).
 */
export enum NotificationType {
  FriendRequest = 'friend_request',
  FriendAccepted = 'friend_accepted',
  MatchInvite = 'match_invite',
  MatchCompleted = 'match_completed',
  MatchHappenedCheck = 'match_happened_check',
  ResultDisputed = 'result_disputed',
  /**
   * Legacy: nothing emits this any more — MatchCompleted replaced it. Kept so
   * that pre-existing rows still render and still satisfy the CHECK constraint.
   * Safe to delete once `SELECT DISTINCT type FROM notifications` confirms no
   * row uses it.
   */
  RatePlayers = 'rate_players',
}
