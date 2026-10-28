-- =============================================================================
-- 0001_constrain_enum_columns.sql — put the enums in the database
-- =============================================================================
--
-- WHY
--
-- Every constrained set of values now has exactly one TypeScript enum, one file
-- each, in shared/enums/. Four of them are backed by real Postgres enum types
-- (sport_type, match_status, account_type, team_side). Four more were plain
-- TEXT columns with nothing but a trailing comment naming the allowed values:
--
--   match_participants.status   -- confirmed, waitlist, cancelled
--   friendships.status          -- pending, accepted, blocked
--   bookings.status             -- pending, confirmed, cancelled
--   notifications.type          -- friend_request, friend_accepted, etc.
--
-- Nothing stopped a typo being written to any of them. This adds a CHECK
-- constraint to each, so the database enforces the same set the TypeScript
-- enum does. user_reports.reason gets one too.
--
-- WHY CHECK RATHER THAN A POSTGRES ENUM TYPE
--
-- A deliberate choice: adding a value to a Postgres enum is easy, but removing
-- or reordering one means recreating the type and every column using it. A
-- CHECK constraint is dropped and re-added in one statement. The TypeScript
-- enum stays the source of truth; this mirrors it.
--
-- BEFORE RUNNING THIS
--
-- Adding a CHECK to a table that already holds a violating row fails. Run this
-- first and compare the output against the lists below:
--
--   SELECT DISTINCT status FROM match_participants;
--   SELECT DISTINCT status FROM friendships;
--   SELECT DISTINCT status FROM bookings;
--   SELECT DISTINCT type   FROM notifications;
--   SELECT DISTINCT reason FROM user_reports;
--
-- Each constraint is added NOT VALID and then validated separately, so an
-- unexpected value fails on its own VALIDATE statement, naming the constraint,
-- instead of aborting everything. If one fails, fix or delete the offending
-- rows and re-run just that VALIDATE.
--
-- notifications.type includes 'rate_players', which nothing emits any more
-- (match_completed replaced it). Keep it: the DISTINCT query was run against
-- the live project on 2026-10-28 and rows do still use it, so dropping the
-- value would make this constraint reject existing data.
--
-- KEEPING THE TWO IN SYNC
--
-- Adding a value to an enum in shared/enums/ means dropping and re-adding the
-- matching constraint here, in the same unit of work. The constraint names
-- below exist so that is a two-line change.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- match_participants.status  <-  shared/enums/participantStatus.ts
-- -----------------------------------------------------------------------------

ALTER TABLE match_participants DROP CONSTRAINT IF EXISTS match_participants_status_check;
ALTER TABLE match_participants
  ADD CONSTRAINT match_participants_status_check
  CHECK (status IN ('confirmed', 'waitlist', 'cancelled')) NOT VALID;
ALTER TABLE match_participants VALIDATE CONSTRAINT match_participants_status_check;


-- -----------------------------------------------------------------------------
-- friendships.status  <-  shared/enums/friendshipStatus.ts
-- -----------------------------------------------------------------------------

ALTER TABLE friendships DROP CONSTRAINT IF EXISTS friendships_status_check;
ALTER TABLE friendships
  ADD CONSTRAINT friendships_status_check
  CHECK (status IN ('pending', 'accepted', 'blocked')) NOT VALID;
ALTER TABLE friendships VALIDATE CONSTRAINT friendships_status_check;


-- -----------------------------------------------------------------------------
-- bookings.status  <-  shared/enums/bookingStatus.ts
-- -----------------------------------------------------------------------------

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled')) NOT VALID;
ALTER TABLE bookings VALIDATE CONSTRAINT bookings_status_check;


-- -----------------------------------------------------------------------------
-- notifications.type  <-  shared/enums/notificationType.ts
--
-- match_completed and match_happened_check are inserted by DB functions
-- (notify_match_completion in match_completion_notifications.sql,
-- send_match_confirmation_check in match_confirmation.sql). Omitting either
-- would make those triggers fail at runtime.
--
-- rate_players is legacy — see the note at the top of this file.
-- -----------------------------------------------------------------------------

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'friend_request',
    'friend_accepted',
    'match_invite',
    'match_completed',        -- inserted by notify_match_completion()
    'match_happened_check',   -- inserted by send_match_confirmation_check()
    'result_disputed',
    'rate_players'            -- legacy, but live rows still use it
  )) NOT VALID;
ALTER TABLE notifications VALIDATE CONSTRAINT notifications_type_check;


-- -----------------------------------------------------------------------------
-- user_reports.reason  <-  shared/enums/reportReason.ts
-- -----------------------------------------------------------------------------

ALTER TABLE user_reports DROP CONSTRAINT IF EXISTS user_reports_reason_check;
ALTER TABLE user_reports
  ADD CONSTRAINT user_reports_reason_check
  CHECK (reason IN ('spam_scam', 'inappropriate_behavior', 'fake_profile', 'other')) NOT VALID;
ALTER TABLE user_reports VALIDATE CONSTRAINT user_reports_reason_check;


-- =============================================================================
-- Already constrained elsewhere, listed here so the full picture is in one
-- place:
--
--   match_results.submitter_team       CHECK (home, away)             rating_migration.sql
--   match_results.winner_side          CHECK (home, away, draw)       rating_migration.sql
--   match_results.counter_winner_side  CHECK (home, away, draw)       rating_migration.sql
--   match_results.status               CHECK (submitted, confirmed,
--                                             disputed, abandoned)    rating_migration.sql
--
--   profiles.account_type   account_type   (Postgres enum)
--   matches.status          match_status   (Postgres enum)
--   matches.sport           sport_type     (Postgres enum)
--   match_ratings.sport     sport_type     (Postgres enum)
--   player_ratings.sport    sport_type     (Postgres enum)
--   venues.sports           sport_type[]   (Postgres enum array)
--   match_teams.side        team_side      (Postgres enum)
-- =============================================================================
