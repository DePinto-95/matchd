-- ============================================================
-- Peer rating hardening
-- Run in Supabase SQL Editor
--
-- Replaces update_player_rating with a sybil-resistant version.
-- The trigger binding on match_ratings is preserved by
-- CREATE OR REPLACE (no need to recreate the trigger).
--
-- Two changes vs the original bias correction:
--   • UPWARD-CORRECTION CAP (boost_cap): bias correction may suppress
--     a generous rater without limit, but may BOOST a harsh rater's
--     score by at most +boost_cap. Closes the "lowball your own
--     history, then inflate a target" amplification exploit.
--   • RATER CREDIBILITY WEIGHT: the EMA learning rate is scaled by how
--     many DISTINCT players the rater has rated. A sock-puppet that
--     only ever rates one friend gets minimal pull (cred_floor); full
--     pull is reached at cred_full distinct ratees.
--
-- Tunable constants are declared at the top of the function body.
-- ============================================================

CREATE OR REPLACE FUNCTION update_player_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_peer_old    NUMERIC;
  v_elo_old     NUMERIC;
  v_elo_applied BOOLEAN;
  v_rater_avg   NUMERIC;
  v_correction  NUMERIC;
  v_adj_score   NUMERIC;
  v_distinct    INT;
  v_cred        NUMERIC;
  v_eff_alpha   NUMERIC;
  v_peer_new    NUMERIC;
  v_team_size   INT;
  v_w_elo       NUMERIC;
  v_combined    NUMERIC;
  alpha      CONSTANT NUMERIC := 0.18;   -- base learning rate
  boost_cap  CONSTANT NUMERIC := 1.0;    -- max UPWARD bias correction
  cred_full  CONSTANT NUMERIC := 4;      -- distinct ratees for full credibility
  cred_floor CONSTANT NUMERIC := 0.25;   -- min credibility weight (new/narrow raters)
BEGIN
  -- Only process INSERT (skip upsert UPDATE path)
  IF TG_OP = 'UPDATE' THEN RETURN NEW; END IF;

  -- Ensure a player_ratings row exists
  INSERT INTO player_ratings
    (player_id, sport, rating, peer_rating, elo_rating, elo_applied, rating_count, total_matches, wins)
  VALUES (NEW.rated_player_id, NEW.sport, 2.0, 2.0, 2.0, FALSE, 0, 0, 0)
  ON CONFLICT (player_id, sport) DO NOTHING;

  SELECT peer_rating, elo_rating, elo_applied
    INTO v_peer_old, v_elo_old, v_elo_applied
    FROM player_ratings
   WHERE player_id = NEW.rated_player_id AND sport = NEW.sport;

  -- Rater's lifetime average (excluding the current row)
  SELECT AVG(score) INTO v_rater_avg
    FROM match_ratings
   WHERE rater_id = NEW.rater_id AND id != NEW.id;

  -- Bias correction with the UPWARD boost capped
  IF v_rater_avg IS NULL THEN
    v_adj_score := NEW.score;                    -- no history yet
  ELSE
    v_correction := 5.0 - v_rater_avg;           -- + boosts harsh raters, - suppresses generous ones
    IF v_correction > boost_cap THEN             -- cap ONLY the upward boost
      v_correction := boost_cap;
    END IF;
    v_adj_score := NEW.score + v_correction;
    v_adj_score := GREATEST(1.0, LEAST(10.0, v_adj_score));
  END IF;

  -- Credibility: how many DISTINCT players this rater has rated before
  SELECT COUNT(DISTINCT rated_player_id) INTO v_distinct
    FROM match_ratings
   WHERE rater_id = NEW.rater_id AND id != NEW.id;

  v_cred      := LEAST(1.0, GREATEST(cred_floor, v_distinct::NUMERIC / cred_full));
  v_eff_alpha := alpha * v_cred;

  -- EMA with the credibility-scaled learning rate
  v_peer_new := (1.0 - v_eff_alpha) * v_peer_old + v_eff_alpha * v_adj_score;
  v_peer_new := GREATEST(1.0, LEAST(10.0, v_peer_new));

  -- Combined rating
  IF v_elo_applied THEN
    SELECT team_size INTO v_team_size FROM matches WHERE id = NEW.match_id;
    v_w_elo    := 0.8 / (1.0 + 0.5 * LN(GREATEST(v_team_size::NUMERIC, 1.0)));
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
