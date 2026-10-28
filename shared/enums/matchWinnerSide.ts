/**
 * Outcome of a match result. Wider than TeamSide because a match can be drawn.
 * DB: `match_results.winner_side` and `counter_winner_side` (TEXT + CHECK).
 */
export enum MatchWinnerSide {
  Home = 'home',
  Away = 'away',
  Draw = 'draw',
}
