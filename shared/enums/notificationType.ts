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
   * Legacy: nothing emits this any more — MatchCompleted replaced it.
   *
   * Do NOT delete. Confirmed 2026-10-28 that live rows still use it, so the
   * notifications page needs its branch (it routes to the rate screen) and the
   * CHECK constraint needs the value.
   */
  RatePlayers = 'rate_players',
}
