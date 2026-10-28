-- =============================================================================
-- 0000_baseline_schema.sql — MatchD base schema
-- =============================================================================
--
-- WHY THIS FILE EXISTS
--
-- Until now the database was not in version control. The 12 core tables lived
-- only in a prose document at the repo root ("claude initial instructions.md",
-- the sql block starting around line 42), and several columns, one whole table
-- and one RPC existed *only* in the hosted Supabase project, having been typed
-- straight into the SQL editor. There was no way to rebuild the database from
-- this repo, and no way to see what the database actually looks like without
-- opening the dashboard.
--
-- This file is the starting point: everything needed to create the schema from
-- nothing, as it is believed to exist today.
--
-- HOW ACCURATE IS IT
--
-- Sections marked [VERIFIED] come from SQL that is in this repo.
-- Sections marked [RECONSTRUCTED] were rebuilt from the TypeScript types, the
-- queries the app makes, and CLAUDE.md, because no SQL for them exists
-- anywhere. They are the best available reading, not a transcript.
--
-- Before trusting this file, diff it against the real thing:
--
--   supabase db dump --schema public -f live_schema.sql
--   # or: pg_dump --schema-only --schema=public "$DATABASE_URL" > live_schema.sql
--
-- and correct whatever differs. Until that diff has been done once, treat the
-- [RECONSTRUCTED] parts as unconfirmed.
--
-- ORDERING: run this first, then the files listed in supabase/README.md.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- ENUM TYPES  [VERIFIED]
--
-- These four are real Postgres enums. Their presence in the live database is
-- confirmed by later patch scripts declaring plpgsql variables of type
-- sport_type (elo_trigger_fix.sql, rating_migration.sql,
-- rating_weight_by_reviews.sql).
--
-- Every other constrained column is TEXT with a CHECK constraint instead —
-- see 0001_constrain_enum_columns.sql. Each one mirrors a TypeScript enum in
-- shared/enums/; the two must be changed together.
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE sport_type AS ENUM (
    'football', 'mini_football_5v5', 'mini_football_8v8', 'padel',
    'tennis', 'basketball', 'volleyball', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_status AS ENUM ('open', 'full', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('player', 'venue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE team_side AS ENUM ('home', 'away');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- -----------------------------------------------------------------------------
-- PROFILES  [VERIFIED] — extends Supabase auth.users
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type account_type NOT NULL DEFAULT 'player',
  username     TEXT UNIQUE NOT NULL,
  full_name    TEXT,
  avatar_url   TEXT,
  bio          TEXT,
  location     TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- PLAYER RATINGS  [VERIFIED] — one row per (player, sport)
--
-- The visible `rating` blends `elo_rating` (match outcomes) and `peer_rating`
-- (reviews). All three start at 2.0 and are NUMERIC(5,3).
--
-- NOTE (MD-12): CLAUDE.md said the default was 5.0. The SQL has always used
-- 2.0 (rating_migration.sql sets the default and seeds both sub-ratings at
-- 2.0; rating_precision.sql widens the columns). 2.0 is correct — the docs
-- were wrong, and this matters because matches gate joining on `min_rating`.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS player_ratings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sport         sport_type NOT NULL,
  rating        NUMERIC(5,3) DEFAULT 2.0 CHECK (rating >= 1 AND rating <= 10),
  elo_rating    NUMERIC(5,3) NOT NULL DEFAULT 2.0,
  peer_rating   NUMERIC(5,3) NOT NULL DEFAULT 2.0,
  elo_applied   BOOLEAN NOT NULL DEFAULT FALSE,
  total_matches INT DEFAULT 0,
  wins          INT DEFAULT 0,
  rating_count  INT DEFAULT 0,
  UNIQUE (player_id, sport)
);


-- -----------------------------------------------------------------------------
-- VENUES  [VERIFIED] — owned by `venue` accounts
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS venues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  address     TEXT NOT NULL,
  city        TEXT NOT NULL,
  latitude    NUMERIC(9,6),
  longitude   NUMERIC(9,6),
  phone       TEXT,
  email       TEXT,
  logo_url    TEXT,
  cover_url   TEXT,
  sports      sport_type[],
  amenities   TEXT[],
  verified    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- MATCHES  [VERIFIED, except two columns]
--
-- `rating_notifications_sent` is [RECONSTRUCTED]: it is read by
-- match_completion_notifications.sql and by the match detail page, but no
-- script in this repo ever creates it.
-- `confirmation_sent_at` is [VERIFIED] (match_confirmation.sql adds it).
--
-- `current_players` counts held squad spots as well as participant rows, so it
-- can drift from the row count; see adjust_match_player_count below and
-- MD-20/MD-31. The app therefore computes fullness from the rows
-- (web/features/matches/lib/occupancy.ts) rather than trusting this column.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS matches (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id                UUID REFERENCES profiles(id) ON DELETE SET NULL,
  venue_id                  UUID REFERENCES venues(id) ON DELETE SET NULL,
  sport                     sport_type NOT NULL,
  title                     TEXT NOT NULL,
  description               TEXT,
  location_name             TEXT NOT NULL,
  latitude                  NUMERIC(9,6),
  longitude                 NUMERIC(9,6),
  scheduled_at              TIMESTAMPTZ NOT NULL,
  duration_minutes          INT DEFAULT 90,
  max_players               INT NOT NULL,
  current_players           INT DEFAULT 0,
  team_size                 INT NOT NULL,            -- players per team
  min_rating                NUMERIC(4,2) DEFAULT 1.0,
  max_rating                NUMERIC(4,2) DEFAULT 10.0,
  is_private                BOOLEAN DEFAULT FALSE,
  invite_code               TEXT UNIQUE,
  status                    match_status DEFAULT 'open',
  price_per_player          NUMERIC(8,2) DEFAULT 0,  -- no payment flow yet
  currency                  TEXT DEFAULT 'EUR',
  rating_notifications_sent BOOLEAN DEFAULT FALSE,   -- [RECONSTRUCTED]
  confirmation_sent_at      TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- MATCH TEAMS  [VERIFIED] — exactly one home and one away row per match
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS match_teams (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  side     team_side NOT NULL,
  name     TEXT,
  UNIQUE (match_id, side)
);


-- -----------------------------------------------------------------------------
-- MATCH PARTICIPANTS  [VERIFIED, except three columns]
--
-- extra_spots / extra_spots_opponent / rating_submitted are [RECONSTRUCTED]:
-- the app reads and writes all three but no script here creates them.
--
-- A player has at most one row per match. `extra_spots` holds places on their
-- own team for people they are bringing; `extra_spots_opponent` holds places
-- on the opposing team. Both are counted into matches.current_players via
-- adjust_match_player_count, not by the row trigger.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS match_participants (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id             UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id            UUID REFERENCES profiles(id) ON DELETE CASCADE,
  team_id              UUID REFERENCES match_teams(id) ON DELETE SET NULL,
  joined_at            TIMESTAMPTZ DEFAULT NOW(),
  status               TEXT DEFAULT 'confirmed',  -- see 0001 for the CHECK
  extra_spots          INT NOT NULL DEFAULT 0,    -- [RECONSTRUCTED]
  extra_spots_opponent INT NOT NULL DEFAULT 0,    -- [RECONSTRUCTED]
  rating_submitted     BOOLEAN NOT NULL DEFAULT FALSE, -- [RECONSTRUCTED]
  UNIQUE (match_id, player_id)
);


-- -----------------------------------------------------------------------------
-- SQUADS  [VERIFIED] — a named group of players.
-- No create/manage UI exists yet (MD-14).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS squads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS squad_members (
  squad_id  UUID REFERENCES squads(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (squad_id, player_id)
);


-- -----------------------------------------------------------------------------
-- FRIENDSHIPS  [VERIFIED]
--
-- Directional on request (requester -> addressee), mutual once accepted.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT DEFAULT 'pending',  -- see 0001 for the CHECK
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id)
);


-- -----------------------------------------------------------------------------
-- MATCH RATINGS  [VERIFIED] — one score per (match, rater, rated player)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS match_ratings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID REFERENCES matches(id) ON DELETE CASCADE,
  rater_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rated_player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sport           sport_type NOT NULL,
  score           INT CHECK (score >= 1 AND score <= 10),
  comment         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (match_id, rater_id, rated_player_id)
);


-- -----------------------------------------------------------------------------
-- NOTIFICATIONS  [VERIFIED]
--
-- Any authenticated user may INSERT, which is what lets one user notify
-- another (friend requests, match invites). Reads are limited to your own.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,  -- see 0001 for the CHECK
  title      TEXT NOT NULL,
  body       TEXT,
  data       JSONB,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- BOOKINGS  [VERIFIED] — venue-side reservations.
-- No player-facing booking flow exists yet (MD-13).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bookings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   UUID REFERENCES venues(id) ON DELETE CASCADE,
  match_id   UUID REFERENCES matches(id) ON DELETE SET NULL,
  booked_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  field_name TEXT,
  starts_at  TIMESTAMPTZ NOT NULL,
  ends_at    TIMESTAMPTZ NOT NULL,
  status     TEXT DEFAULT 'pending',  -- see 0001 for the CHECK
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- USER REPORTS  [RECONSTRUCTED]
--
-- No SQL for this table exists anywhere in the repo; it was rebuilt from
-- shared/types/report.ts, the insert in shared/stores/friendStore.ts, and
-- CLAUDE.md. The unique constraint is what makes a duplicate report surface as
-- error 23505, which the app relies on to say "you already reported this user".
--
-- Deliberately has no SELECT policy: reports are write-only from the client.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,  -- see 0001 for the CHECK
  details     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (reporter_id, reported_id)
);


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_ratings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_ratings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues             ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships        ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports       ENABLE ROW LEVEL SECURITY;

-- Profiles / ratings / matches / participants  [VERIFIED]
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Player ratings viewable by everyone" ON player_ratings FOR SELECT USING (true);

CREATE POLICY "Matches viewable by everyone" ON matches FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create matches" ON matches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Creator can update their match" ON matches FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Participants viewable by everyone" ON match_participants FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join matches" ON match_participants FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "Users can leave matches" ON match_participants FOR DELETE USING (auth.uid() = player_id);

CREATE POLICY "Ratings viewable by everyone" ON match_ratings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can rate" ON match_ratings FOR INSERT WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Venues viewable by everyone" ON venues FOR SELECT USING (true);
CREATE POLICY "Venue owners can manage their venue" ON venues FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Users see their own bookings" ON bookings FOR SELECT USING (
  auth.uid() = booked_by
  OR venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid())
);

-- -----------------------------------------------------------------------------
-- [RECONSTRUCTED] policies below. CLAUDE.md describes this behaviour and the
-- app depends on it, but no SQL for it exists in the repo.
-- -----------------------------------------------------------------------------

-- A participant must be able to update their own held-spot counts, and the
-- squad panel lets a creator adjust them too.
CREATE POLICY "Users can update their own participation" ON match_participants
  FOR UPDATE USING (auth.uid() = player_id);

CREATE POLICY "Teams viewable by everyone" ON match_teams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create teams" ON match_teams
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Friendships: both sides can read and delete; only the addressee may accept;
-- only the requester may create.
CREATE POLICY "Users see their own friendships" ON friendships FOR SELECT USING (
  auth.uid() = requester_id OR auth.uid() = addressee_id
);
CREATE POLICY "Requester can create a friendship" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Addressee can accept a friendship" ON friendships
  FOR UPDATE USING (auth.uid() = addressee_id);
CREATE POLICY "Either side can delete a friendship" ON friendships FOR DELETE USING (
  auth.uid() = requester_id OR auth.uid() = addressee_id
);

-- Notifications: anyone authenticated may send one (that is how a friend
-- request reaches its recipient); you only ever read or change your own.
CREATE POLICY "Authenticated users can send notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users see their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete their own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Reports are write-only from the client: no SELECT policy on purpose.
CREATE POLICY "Users can file a report" ON user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Squads viewable by everyone" ON squads FOR SELECT USING (true);
CREATE POLICY "Squad members viewable by everyone" ON squad_members FOR SELECT USING (true);


-- =============================================================================
-- STORAGE  [RECONSTRUCTED]
--
-- Public `avatars` bucket, path pattern {userId}/avatar.{ext}. Write access is
-- scoped by making the first path segment the user's own id.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can replace their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- update_match_player_count  [VERIFIED]
--
-- Keeps matches.current_players in step with participant rows, by one per row,
-- and flips status to 'full' at capacity.
--
-- Known problem (MD-20): the DELETE branch resets status to 'open' and does
-- not release held spots, so a leaving player's extra_spots stay counted until
-- the client separately calls adjust_match_player_count. If that second call
-- fails, current_players drifts permanently.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_match_player_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE matches SET current_players = current_players + 1 WHERE id = NEW.match_id;
    IF (SELECT current_players FROM matches WHERE id = NEW.match_id)
       >= (SELECT max_players FROM matches WHERE id = NEW.match_id) THEN
      UPDATE matches SET status = 'full' WHERE id = NEW.match_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE matches
       SET current_players = GREATEST(current_players - 1, 0),
           status = 'open'
     WHERE id = OLD.match_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_participant_change ON match_participants;
CREATE TRIGGER on_participant_change
AFTER INSERT OR DELETE ON match_participants
FOR EACH ROW EXECUTE FUNCTION update_match_player_count();


-- -----------------------------------------------------------------------------
-- adjust_match_player_count  [RECONSTRUCTED]
--
-- Called by the client to add or release *held* squad spots, on top of the one
-- place the row trigger already counts. Reconstructed from its three call
-- sites in web/features/matches (join, leave, update held spots) and the
-- behaviour described in MD-20 and MD-31 — in particular that it does not
-- reliably move matches.status, which is why the UI derives fullness from the
-- participant rows instead.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION adjust_match_player_count(p_match_id UUID, p_delta INT)
RETURNS VOID AS $$
BEGIN
  UPDATE matches
     SET current_players = GREATEST(current_players + p_delta, 0)
   WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- update_player_rating — ORIGINAL VERSION, SUPERSEDED. Do not use.
--
-- The first implementation was a plain running mean. It was replaced by a
-- bias-corrected, credibility-weighted EMA. The authoritative body now lives
-- in rating_weight_by_reviews.sql, and its trigger is created there.
--
-- It is recorded here only so the history is visible; rating_migration.sql
-- drops the original on_rating_inserted trigger. Creating it would overwrite
-- the current rating logic, so it is left commented out deliberately.
--
-- CREATE OR REPLACE FUNCTION update_player_rating() ... (see git history)
-- CREATE TRIGGER on_rating_inserted AFTER INSERT ON match_ratings ...
-- -----------------------------------------------------------------------------
