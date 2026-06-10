-- ============================================================
-- Review deadline: 7-day submission window
-- Run in Supabase SQL Editor
--
-- Reviews can only be submitted (or corrected) within 7 days of
-- the match's scheduled start. After that, late reviews are
-- rejected at the database level.
--
-- No recalculation is needed for "missing" reviews: ratings are
-- updated incrementally per review, and the combined-rating blend
-- weight is based on reviews actually RECEIVED
-- (rating_weight_by_reviews.sql), so a review that never arrives
-- simply leaves more weight on Elo. Closing the window just stops
-- stale reviews from nudging long-settled ratings.
--
-- The app hides the rating UI past the deadline; this trigger is
-- the authoritative backstop.
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_review_deadline()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_scheduled TIMESTAMPTZ;
  review_window CONSTANT INTERVAL := INTERVAL '7 days';
BEGIN
  SELECT scheduled_at INTO v_scheduled
    FROM matches WHERE id = NEW.match_id;

  IF v_scheduled IS NULL THEN
    RAISE EXCEPTION 'match % not found', NEW.match_id;
  END IF;

  IF NOW() > v_scheduled + review_window THEN
    RAISE EXCEPTION 'review window closed: reviews must be submitted within 7 days of the match';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_review_deadline ON match_ratings;
CREATE TRIGGER enforce_review_deadline
  BEFORE INSERT OR UPDATE ON match_ratings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_review_deadline();
