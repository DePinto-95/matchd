-- ============================================================
-- MatchD Hybrid Rating System Migration
-- Run this in Supabase SQL Editor (in order, top to bottom)
-- ============================================================


-- ============================================================
-- 1. ALTER player_ratings
-- ============================================================

-- Add sub-rating columns (default 2.0 — new "earn your rating" baseline)
ALTER TABLE player_ratings
  ADD COLUMN IF NOT EXISTS elo_rating  NUMERIC NOT NULL DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS peer_rating NUMERIC NOT NULL DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS elo_applied BOOLEAN NOT NULL DEFAULT FALSE;

-- Change default for `rating` column to 2.0 for new rows
ALTER TABLE player_ratings ALTER COLUMN rating SET DEFAULT 2.0;

-- New players (0 matches) get reset to 2.0 across all three columns
UPDATE player_ratings
  SET rating = 2.0, elo_rating = 2.0, peer_rating = 2.0
  WHERE total_matches = 0;


-- ============================================================
-- 2. CREATE match_results TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS match_results (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id             UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  submitted_by         UUID NOT NULL REFERENCES profiles(id),
  submitter_team       TEXT NOT NULL CHECK (submitter_team IN ('home', 'away')),
  home_score           INT  NOT NULL CHECK (home_score >= 0),
  away_score           INT  NOT NULL CHECK (away_score >= 0),
  winner_side          TEXT NOT NULL CHECK (winner_side IN ('home', 'away', 'draw')),
  status               TEXT NOT NULL DEFAULT 'submitted'
                         CHECK (status IN ('submitted', 'confirmed', 'disputed', 'abandoned')),
  counter_submitted_by UUID REFERENCES profiles(id),
  counter_home_score   INT  CHECK (counter_home_score >= 0),
  counter_away_score   INT  CHECK (counter_away_score >= 0),
  counter_winner_side  TEXT CHECK (counter_winner_side IN ('home', 'away', 'draw')),
  elo_applied          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id)
);

-- Enable RLS
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

-- Only match participants can view
CREATE POLICY "Participants can view match result"
  ON match_results FOR SELECT
  USING (
    auth.uid() IN (
      SELECT player_id FROM match_participants WHERE match_id = match_results.match_id
    )
  );

-- A participant can submit (INSERT) — app logic ensures correct submitter_team
CREATE POLICY "Participants can submit result"
  ON match_results FOR INSERT
  WITH CHECK (
    auth.uid() = submitted_by AND
    auth.uid() IN (
      SELECT player_id FROM match_participants WHERE match_id = match_results.match_id
    )
  );

-- Any participant can UPDATE (accept / dispute / reject) — app logic enforces whose turn
CREATE POLICY "Participants can update result"
  ON match_results FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT player_id FROM match_participants WHERE match_id = match_results.match_id
    )
  );


-- ============================================================
-- 3. REPLACE update_player_rating TRIGGER (peer EMA + bias correction)
-- ============================================================

-- Drop old trigger and function
DROP TRIGGER IF EXISTS update_player_rating ON match_ratings;
DROP TRIGGER IF EXISTS on_match_rating_insert ON match_ratings;
DROP FUNCTION IF EXISTS update_player_rating() CASCADE;

CREATE OR REPLACE FUNCTION update_player_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_peer_old    NUMERIC;
  v_elo_old     NUMERIC;
  v_elo_applied BOOLEAN;
  v_rater_avg   NUMERIC;
  v_adj_score   NUMERIC;
  v_peer_new    NUMERIC;
  v_team_size   INT;
  v_w_elo       NUMERIC;
  v_combined    NUMERIC;
  alpha         CONSTANT NUMERIC := 0.18;
BEGIN
  -- Only process INSERT (skip upsert UPDATE path — score correction doesn't re-apply EMA)
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Ensure a player_ratings row exists; create with defaults if not
  INSERT INTO player_ratings (player_id, sport, rating, peer_rating, elo_rating, elo_applied, rating_count, total_matches, wins)
  VALUES (NEW.rated_player_id, NEW.sport, 2.0, 2.0, 2.0, FALSE, 0, 0, 0)
  ON CONFLICT (player_id, sport) DO NOTHING;

  -- Fetch current state
  SELECT peer_rating, elo_rating, elo_applied
  INTO v_peer_old, v_elo_old, v_elo_applied
  FROM player_ratings
  WHERE player_id = NEW.rated_player_id AND sport = NEW.sport;

  -- Bias correction: rater's lifetime average EXCLUDING the current row
  SELECT AVG(score) INTO v_rater_avg
  FROM match_ratings
  WHERE rater_id = NEW.rater_id
    AND id != NEW.id;

  IF v_rater_avg IS NULL THEN
    -- First-ever rating from this rater — no correction data yet
    v_adj_score := NEW.score;
  ELSE
    v_adj_score := NEW.score - (v_rater_avg - 5.0);
    v_adj_score := GREATEST(1.0, LEAST(10.0, v_adj_score));
  END IF;

  -- EMA peer update  (α = 0.18, window ≈ 10 ratings)
  v_peer_new := (1.0 - alpha) * v_peer_old + alpha * v_adj_score;
  v_peer_new := GREATEST(1.0, LEAST(10.0, v_peer_new));

  -- Combined rating
  IF v_elo_applied THEN
    SELECT team_size INTO v_team_size FROM matches WHERE id = NEW.match_id;
    v_w_elo   := 0.8 / (1.0 + 0.5 * LN(GREATEST(v_team_size::NUMERIC, 1.0)));
    v_combined := v_w_elo * v_elo_old + (1.0 - v_w_elo) * v_peer_new;
  ELSE
    v_combined := v_peer_new;
  END IF;
  v_combined := GREATEST(1.0, LEAST(10.0, v_combined));

  UPDATE player_ratings
  SET peer_rating  = v_peer_new,
      rating       = v_combined,
      rating_count = rating_count + 1
  WHERE player_id = NEW.rated_player_id AND sport = NEW.sport;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_player_rating
  AFTER INSERT OR UPDATE ON match_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_player_rating();


-- ============================================================
-- 4. CREATE update_elo_rating TRIGGER (fires on confirmed result)
-- ============================================================

CREATE OR REPLACE FUNCTION update_elo_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match_id        UUID;
  v_sport           TEXT;
  v_team_size       INT;
  v_final_winner    TEXT;
  v_home_team_id    UUID;
  v_away_team_id    UUID;
  v_w_elo           NUMERIC;
  v_w_peer          NUMERIC;
  v_K               NUMERIC;
  v_home_avg_elo    NUMERIC;  -- avg elo of home team (used for E calculation)
  v_away_avg_elo    NUMERIC;  -- avg elo of away team (used for E calculation)
  v_E_home          NUMERIC;  -- expected win prob for home team
  v_E_away          NUMERIC;  -- expected win prob for away team
  rec               RECORD;
  v_elo_old         NUMERIC;
  v_peer_old        NUMERIC;
  v_S               NUMERIC;
  v_E               NUMERIC;
  v_elo_new         NUMERIC;
  v_combined        NUMERIC;
BEGIN
  -- Only process when status transitions TO 'confirmed'
  IF NEW.status != 'confirmed' OR OLD.status = 'confirmed' THEN
    RETURN NEW;
  END IF;

  v_match_id := NEW.match_id;

  SELECT sport, team_size INTO v_sport, v_team_size
  FROM matches WHERE id = v_match_id;

  -- Authoritative winner: use counter if it was submitted (Team A accepted counter)
  IF NEW.counter_submitted_by IS NOT NULL THEN
    v_final_winner := NEW.counter_winner_side;
  ELSE
    v_final_winner := NEW.winner_side;
  END IF;

  SELECT id INTO v_home_team_id FROM match_teams WHERE match_id = v_match_id AND side = 'home';
  SELECT id INTO v_away_team_id FROM match_teams WHERE match_id = v_match_id AND side = 'away';

  -- K-factor dampened by team size (0.8 / sqrt(team_size), min team_size = 1)
  v_K := 0.8 / SQRT(GREATEST(v_team_size::NUMERIC, 1.0));

  -- Combined weight
  v_w_elo  := 0.8 / (1.0 + 0.5 * LN(GREATEST(v_team_size::NUMERIC, 1.0)));
  v_w_peer := 1.0 - v_w_elo;

  -- Compute team averages ONCE (team vs team, not individual vs team)
  SELECT AVG(pr.elo_rating) INTO v_home_avg_elo
  FROM match_participants mp2
  JOIN player_ratings pr ON pr.player_id = mp2.player_id AND pr.sport = v_sport
  WHERE mp2.match_id = v_match_id AND mp2.team_id = v_home_team_id AND mp2.status = 'confirmed';

  SELECT AVG(pr.elo_rating) INTO v_away_avg_elo
  FROM match_participants mp2
  JOIN player_ratings pr ON pr.player_id = mp2.player_id AND pr.sport = v_sport
  WHERE mp2.match_id = v_match_id AND mp2.team_id = v_away_team_id AND mp2.status = 'confirmed';

  IF v_home_avg_elo IS NULL THEN v_home_avg_elo := 2.0; END IF;
  IF v_away_avg_elo IS NULL THEN v_away_avg_elo := 2.0; END IF;

  -- E from team averages — same E shared by all players on the same side
  v_E_home := 1.0 / (1.0 + POWER(10.0, (v_away_avg_elo - v_home_avg_elo) / 3.0));
  v_E_away := 1.0 - v_E_home;

  -- Update each confirmed participant
  FOR rec IN
    SELECT mp.player_id, mt.side AS team_side
    FROM match_participants mp
    JOIN match_teams mt ON mt.id = mp.team_id
    WHERE mp.match_id = v_match_id AND mp.status = 'confirmed'
  LOOP
    -- Ensure row exists
    INSERT INTO player_ratings (player_id, sport, rating, peer_rating, elo_rating, elo_applied, rating_count, total_matches, wins)
    VALUES (rec.player_id, v_sport, 2.0, 2.0, 2.0, FALSE, 0, 0, 0)
    ON CONFLICT (player_id, sport) DO NOTHING;

    SELECT elo_rating, peer_rating
    INTO v_elo_old, v_peer_old
    FROM player_ratings
    WHERE player_id = rec.player_id AND sport = v_sport;

    -- Assign team-level E and individual S
    IF rec.team_side = 'home' THEN
      v_E := v_E_home;
      IF v_final_winner = 'home'  THEN v_S := 1.0;
      ELSIF v_final_winner = 'away' THEN v_S := 0.0;
      ELSE v_S := 0.5;
      END IF;
    ELSE
      v_E := v_E_away;
      IF v_final_winner = 'away'  THEN v_S := 1.0;
      ELSIF v_final_winner = 'home' THEN v_S := 0.0;
      ELSE v_S := 0.5;
      END IF;
    END IF;

    -- Elo delta applied to the player's own individual rating
    v_elo_new := GREATEST(1.0, LEAST(10.0, v_elo_old + v_K * (v_S - v_E)));

    -- Combined
    v_combined := GREATEST(1.0, LEAST(10.0, v_w_elo * v_elo_new + v_w_peer * v_peer_old));

    UPDATE player_ratings
    SET elo_rating    = v_elo_new,
        rating        = v_combined,
        elo_applied   = TRUE,
        total_matches = total_matches + 1,
        wins          = wins + CASE WHEN v_S = 1.0 THEN 1 ELSE 0 END
    WHERE player_id = rec.player_id AND sport = v_sport;
  END LOOP;

  -- Stamp elo_applied on the result row
  NEW.elo_applied := TRUE;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_elo_rating
  BEFORE UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION update_elo_rating();
