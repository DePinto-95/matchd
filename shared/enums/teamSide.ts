/**
 * Which side of a match a team or participant is on.
 * DB: Postgres enum `team_side` — `match_teams.side`.
 */
export enum TeamSide {
  Home = 'home',
  Away = 'away',
}
