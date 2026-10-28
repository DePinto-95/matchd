/**
 * Sports a match can be played in.
 * DB: Postgres enum `sport_type` — `matches.sport`, `match_ratings.sport`,
 * `player_ratings.sport`, `venues.sports[]`.
 */
export enum SportType {
  Football = 'football',
  MiniFootball5v5 = 'mini_football_5v5',
  MiniFootball8v8 = 'mini_football_8v8',
  Padel = 'padel',
  Tennis = 'tennis',
  Basketball = 'basketball',
  Volleyball = 'volleyball',
  Other = 'other',
}
