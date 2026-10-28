/**
 * Kind of account a profile represents.
 * DB: Postgres enum `account_type` — `profiles.account_type`.
 */
export enum AccountType {
  Player = 'player',
  Venue = 'venue',
}
