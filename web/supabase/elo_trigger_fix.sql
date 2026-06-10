-- ============================================================
-- Elo trigger fix
-- Run in Supabase SQL Editor
--
-- Fixes:
--   1. Elo must only apply when result status transitions to
--      'confirmed' — never on INSERT or any other status change.
--   2. total_matches now also increments on 'abandoned' so
--      disputed/unresolved matches still count toward the
--      5-match display gate.
-- ============================================================

DROP TRIGGER IF EXISTS update_elo_rating ON match_results;
DROP FUNCTION IF EXISTS update_elo_rating() CASCADE;

CREATE OR REPLACE FUNCTION update_elo_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match_id     UUID;
  v_sport        sport_type;
  v_team_size    INT;
  v_final_winner TEXT;
  v_home_team_id UUID;
  v_away_team_id UUID;
  v_w_elo        NUMERIC;
  v_w_peer       NUMERIC;
  v_K            NUMERIC;
  v_home_avg_elo NUMERIC;
  v_away_avg_elo NUMERIC;
  v_E_home       NUMERIC;
  v_E_away       NUMERIC;
  rec            RECORD;
  v_elo_old      NUMERIC;
  v_peer_old     NUMERIC;
  v_S            NUMERIC;
  v_E            NUMERIC;
  v_elo_new      NUMERIC;
  v_combined     NUMERIC;
BEGIN
  -- Must be an UPDATE (not INSERT or DELETE)
  IF TG_OP != 'UPDATE' THEN RETURN NEW; END IF;

  -- Only process the first transition into a terminal state
  IF NEW.status NOT IN ('confirmed', 'abandoned') THEN RETURN NEW; END IF;
  IF OLD.status IN ('confirmed', 'abandoned')     THEN RETURN NEW; END IF;

  v_match_id := NEW.match_id;

  SELECT sport, team_size INTO v_sport, v_team_size
  FROM matches WHERE id = v_match_id;

  -- ── ABANDONED: match happened but result was disputed and unresolved ──
  -- Increment total_matches so the match counts toward the display gate;
  -- do NOT touch elo_rating or the combined rating.
  IF NEW.status = 'abandoned' THEN
    FOR rec IN
      SELECT mp.player_id
      FROM match_participants mp
      WHERE mp.match_id = v_match_id AND mp.status = 'confirmed'
    LOOP
      INSERT INTO player_ratings
        (player_id, sport, rating, peer_rating, elo_rating, elo_applied, rating_count, total_matches, wins)
      VALUES
        (rec.player_id, v_sport, 2.0, 2.0, 2.0, FALSE, 0, 0, 0)
      ON CONFLICT (player_id, sport) DO NOTHING;

      UPDATE player_ratings
         SET total_matches = total_matches + 1
       WHERE player_id = rec.player_id AND sport = v_sport;
    END LOOP;
    RETURN NEW;
  END IF;

  -- ── CONFIRMED: apply full Elo update ──

  -- Authoritative winner: use counter if Team B's counter was accepted
  IF NEW.counter_submitted_by IS NOT NULL THEN
    v_final_winner := NEW.counter_winner_side;
  ELSE
    v_final_winner := NEW.winner_side;
  END IF;

  SELECT id INTO v_home_team_id FROM match_teams WHERE match_id = v_match_id AND side = 'home';
  SELECT id INTO v_away_team_id FROM match_teams WHERE match_id = v_match_id AND side = 'away';

  -- K-factor dampened by team size
  v_K      := 0.8 / SQRT(GREATEST(v_team_size::NUMERIC, 1.0));
  v_w_elo  := 0.8 / (1.0 + 0.5 * LN(GREATEST(v_team_size::NUMERIC, 1.0)));
  v_w_peer := 1.0 - v_w_elo;

  -- Team average Elo (used for expected-score calculation)
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

  v_E_home := 1.0 / (1.0 + POWER(10.0, (v_away_avg_elo - v_home_avg_elo) / 3.0));
  v_E_away := 1.0 - v_E_home;

  -- Update each confirmed participant
  FOR rec IN
    SELECT mp.player_id, mt.side AS team_side
    FROM match_participants mp
    JOIN match_teams mt ON mt.id = mp.team_id
    WHERE mp.match_id = v_match_id AND mp.status = 'confirmed'
  LOOP
    INSERT INTO player_ratings
      (player_id, sport, rating, peer_rating, elo_rating, elo_applied, rating_count, total_matches, wins)
    VALUES
      (rec.player_id, v_sport, 2.0, 2.0, 2.0, FALSE, 0, 0, 0)
    ON CONFLICT (player_id, sport) DO NOTHING;

    SELECT elo_rating, peer_rating
      INTO v_elo_old, v_peer_old
      FROM player_ratings
     WHERE player_id = rec.player_id AND sport = v_sport;

    IF rec.team_side = 'home' THEN
      v_E := v_E_home;
      IF    v_final_winner = 'home' THEN v_S := 1.0;
      ELSIF v_final_winner = 'away' THEN v_S := 0.0;
      ELSE                               v_S := 0.5;
      END IF;
    ELSE
      v_E := v_E_away;
      IF    v_final_winner = 'away' THEN v_S := 1.0;
      ELSIF v_final_winner = 'home' THEN v_S := 0.0;
      ELSE                               v_S := 0.5;
      END IF;
    END IF;

    v_elo_new  := GREATEST(1.0, LEAST(10.0, v_elo_old + v_K * (v_S - v_E)));
    v_combined := GREATEST(1.0, LEAST(10.0, v_w_elo * v_elo_new + v_w_peer * v_peer_old));

    UPDATE player_ratings
       SET elo_rating    = v_elo_new,
           rating        = v_combined,
           elo_applied   = TRUE,
           total_matches = total_matches + 1,
           wins          = wins + CASE WHEN v_S = 1.0 THEN 1 ELSE 0 END
     WHERE player_id = rec.player_id AND sport = v_sport;
  END LOOP;

  NEW.elo_applied := TRUE;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_elo_rating
  BEFORE UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION update_elo_rating();
