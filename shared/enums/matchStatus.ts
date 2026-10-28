/**
 * Match lifecycle: Open -> Full -> InProgress -> Completed / Cancelled.
 * DB: Postgres enum `match_status` — `matches.status`.
 */
export enum MatchStatus {
  Open = 'open',
  Full = 'full',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
}
