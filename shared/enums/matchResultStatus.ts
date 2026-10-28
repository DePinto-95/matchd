/**
 * State of a reported match result as it moves through dispute resolution.
 * DB: `match_results.status` (TEXT + CHECK constraint).
 */
export enum MatchResultStatus {
  Submitted = 'submitted',
  Confirmed = 'confirmed',
  Disputed = 'disputed',
  Abandoned = 'abandoned',
}
