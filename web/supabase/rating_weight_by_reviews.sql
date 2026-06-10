-- ============================================================
-- Blend weight by reviews RECEIVED (replaces team-size weight)
-- Run in Supabase SQL Editor
--
-- Supersedes the w_elo formula in rating_hardening.sql and
-- elo_trigger_fix.sql (everything else in those functions is
-- preserved verbatim).
--
-- OLD: rating = w_elo*elo + (1-w_elo)*peer with
--      w_elo = 0.8 / (1 + 0.5*ln(team_size)) — i.e. the weight came
--      from the team size of WHATEVER match last recomputed the
--      rating, so a player mixing formats saw their displayed
--      rating jump with no new information.
--
-- NEW: the review side's weight grows with how many reviews the
--      player has actually RECEIVED in that sport (rating_count):
--
--        w_peer = LEAST(0.6, n / (n + 4))      n = reviews received
--        rating = (1 - w_peer)*elo + w_peer*peer
--
--        n=0 -> all Elo (no review info exists yet)
--        n=1 -> 0.20 review / 0.80 Elo   (after one 1v1)
--        n=4 -> 0.50 / 0.50              (after one 5v5: 2 teammates
--                                         + 2 opponents review you)
--        n>=6 -> capped at 0.60 review / 0.40 Elo, so confirmed
--                results always keep influence
--
--      rating_count only ever grows, so the weight is stable and
--      monotonic — no more format-dependent jumps.
--
-- Mirrored by web/supabase/rating_sim.py — keep both in sync.
-- ============================================================


-- ============================================================
-- 1. update_player_rating  (peer trigger, fires on review INSERT)
-- ============================================================

CREATE OR REPLACE FUNCTION update_player_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_peer_old    NUMERIC;
  v_elo_old     NUMERIC;
  v_elo_applied BOOLEAN;
  v_count_old   INT;
  v_rater_avg   NUMERIC;
  v_correction  NUMERIC;
  v_adj_score   NUMERIC;
  v_distinct    INT;
  v_cred        NUMERIC;
  v_eff_alpha   NUMERIC;
  v_peer_new    NUMERIC;
  v_n           NUMERIC;
  v_w_peer      NUMERIC;
  v_combined    NUMERIC;
  alpha      CONSTANT NUMERIC := 0.18;   -- base learning rate
  boost_cap  CONSTANT NUMERIC := 1.0;    -- max UPWARD bias correction
  cred_full  CONSTANT NUMERIC := 4;      -- distinct ratees for full credibility
  cred_floor CONSTANT NUMERIC := 0.25;   -- min credibility weight (new/narrow raters)
  w_peer_cap CONSTANT NUMERIC := 0.6;    -- max review weight in the blend
  w_half     CONSTANT NUMERIC := 4.0;    -- reviews received for a 50/50 blend
BEGIN
  -- Only process INSERT (skip upsert UPDATE path)
  IF TG_OP = 'UPDATE' THEN RETURN NEW; END IF;

  -- Ensure a player_ratings row exists
  INSERT INTO player_ratings
    (player_id, sport, rating, peer_rating, elo_rating, elo_applied, rating_count, total_matches, wins)
  VALUES (NEW.rated_player_id, NEW.sport, 2.0, 2.0, 2.0, FALSE, 0, 0, 0)
  ON CONFLICT (player_id, sport) DO NOTHING;

  SELECT peer_rating, elo_rating, elo_applied, rating_count
    INTO v_peer_old, v_elo_old, v_elo_applied, v_count_old
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

  -- Combined rating: review weight grows with reviews RECEIVED
  -- (v_count_old + 1 includes the review being inserted right now)
  IF v_elo_applied THEN
    v_n        := (v_count_old + 1)::NUMERIC;
    v_w_peer   := LEAST(w_peer_cap, v_n / (v_n + w_half));
    v_combined := (1.0 - v_w_peer) * v_elo_old + v_w_peer * v_peer_new;
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


-- ============================================================
-- 2. update_elo_rating  (Elo trigger, fires on confirmed/abandoned)
-- ============================================================

CREATE OR REPLACE FUNCTION update_elo_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match_id     UUID;
  v_sport        sport_type;
  v_team_size    INT;
  v_final_winner TEXT;
  v_home_team_id UUID;
  v_away_team_id UUID;
  v_K            NUMERIC;
  v_home_avg_elo NUMERIC;
  v_away_avg_elo NUMERIC;
  v_E_home       NUMERIC;
  v_E_away       NUMERIC;
  rec            RECORD;
  v_elo_old      NUMERIC;
  v_peer_old     NUMERIC;
  v_count        INT;
  v_w_peer       NUMERIC;
  v_S            NUMERIC;
  v_E            NUMERIC;
  v_elo_new      NUMERIC;
  v_combined     NUMERIC;
  w_peer_cap CONSTANT NUMERIC := 0.6;    -- max review weight in the blend
  w_half     CONSTANT NUMERIC := 4.0;    -- reviews received for a 50/50 blend
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

  -- K-factor still dampened by team size (a 5v5 result says less about
  -- each individual than a 1v1 result) — only the BLEND weight changed.
  v_K := 0.8 / SQRT(GREATEST(v_team_size::NUMERIC, 1.0));

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

    SELECT elo_rating, peer_rating, rating_count
      INTO v_elo_old, v_peer_old, v_count
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

    v_elo_new := GREATEST(1.0, LEAST(10.0, v_elo_old + v_K * (v_S - v_E)));

    -- Per-player blend weight from reviews RECEIVED in this sport
    v_w_peer   := LEAST(w_peer_cap, v_count::NUMERIC / (v_count::NUMERIC + w_half));
    v_combined := GREATEST(1.0, LEAST(10.0, (1.0 - v_w_peer) * v_elo_new + v_w_peer * v_peer_old));

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


-- ============================================================
-- 3. Recompute every stored combined rating under the new weight
--    (peer/elo/counts are untouched — only the blend changes)
-- ============================================================

UPDATE player_ratings
   SET rating = GREATEST(1.0, LEAST(10.0,
         (1.0 - LEAST(0.6, rating_count::NUMERIC / (rating_count::NUMERIC + 4.0))) * elo_rating
       +        LEAST(0.6, rating_count::NUMERIC / (rating_count::NUMERIC + 4.0))  * peer_rating))
 WHERE elo_applied = TRUE;

UPDATE player_ratings
   SET rating = peer_rating
 WHERE elo_applied = FALSE;
