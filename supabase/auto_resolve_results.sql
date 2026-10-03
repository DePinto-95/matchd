-- ============================================================
-- Auto-resolve stale match results
-- Run in Supabase SQL Editor
--
-- Rules:
--   • Team B ignores Team A's submission for 7 days
--     → confirm with Team A's original score
--   • Team A ignores Team B's counter for 7 days
--     → confirm with Team B's counter score
--
-- In both cases a plain UPDATE to status='confirmed' is enough —
-- the existing update_elo_rating trigger fires and picks the
-- correct winner (original or counter) automatically.
-- ============================================================


-- ============================================================
-- 1. Track when a result entered 'disputed' state
-- ============================================================

ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION stamp_disputed_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'disputed' AND (OLD.status IS DISTINCT FROM 'disputed') THEN
    NEW.disputed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stamp_disputed_at ON match_results;
CREATE TRIGGER stamp_disputed_at
  BEFORE UPDATE ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION stamp_disputed_at();


-- ============================================================
-- 2. Auto-resolve function (runs daily)
-- ============================================================

CREATE OR REPLACE FUNCTION auto_resolve_stale_results()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Team B ignored Team A's initial submission → confirm Team A's result
  UPDATE match_results
     SET status = 'confirmed'
   WHERE status = 'submitted'
     AND created_at < NOW() - INTERVAL '7 days'
     AND EXISTS (
           SELECT 1 FROM matches m
            WHERE m.id = match_results.match_id
              AND m.status != 'cancelled'
         );

  -- Team A ignored Team B's counter → confirm Team B's counter
  UPDATE match_results
     SET status = 'confirmed'
   WHERE status = 'disputed'
     AND disputed_at < NOW() - INTERVAL '7 days'
     AND EXISTS (
           SELECT 1 FROM matches m
            WHERE m.id = match_results.match_id
              AND m.status != 'cancelled'
         );
END;
$$;


-- ============================================================
-- 3. Schedule daily at 02:00 UTC
-- ============================================================

DO $$ BEGIN
  PERFORM cron.unschedule('auto-resolve-stale-results');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-resolve-stale-results',
  '0 2 * * *',
  'SELECT auto_resolve_stale_results()'
);
