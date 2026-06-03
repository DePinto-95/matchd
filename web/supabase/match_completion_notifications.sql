-- ============================================================
-- Match Completion Notifications
-- Run this in Supabase SQL Editor
-- ============================================================


-- ============================================================
-- 1. REPLACE notify_match_completion
--    Sends a 'match_completed' notification to every confirmed
--    participant and marks the match so it won't fire again.
-- ============================================================

CREATE OR REPLACE FUNCTION notify_match_completion(p_match_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_title  TEXT;
  v_sport  TEXT;
  v_pid    UUID;
BEGIN
  SELECT title, sport INTO v_title, v_sport
  FROM matches WHERE id = p_match_id;

  FOR v_pid IN
    SELECT player_id FROM match_participants
    WHERE match_id = p_match_id AND status = 'confirmed'
  LOOP
    INSERT INTO notifications (user_id, type, title, body, data, read)
    VALUES (
      v_pid,
      'match_completed',
      'Match finished!',
      'Rate your opponents and report the result for ' || v_title,
      jsonb_build_object('match_id', p_match_id, 'sport', v_sport),
      FALSE
    );
  END LOOP;

  UPDATE matches SET rating_notifications_sent = TRUE WHERE id = p_match_id;
END;
$$;


-- ============================================================
-- 2. CREATE auto_notify_completed_matches
--    Finds every match that has ended and hasn't sent notifications
--    yet, then calls notify_match_completion for each one.
--    Called by the pg_cron job below.
-- ============================================================

CREATE OR REPLACE FUNCTION auto_notify_completed_matches()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match_id UUID;
BEGIN
  FOR v_match_id IN
    SELECT id FROM matches
    WHERE rating_notifications_sent = FALSE
      AND status NOT IN ('cancelled')
      AND (scheduled_at + (duration_minutes || ' minutes')::INTERVAL) < NOW()
  LOOP
    PERFORM notify_match_completion(v_match_id);
  END LOOP;
END;
$$;


-- ============================================================
-- 3. SCHEDULE with pg_cron (runs every 10 minutes)
--    Requires the pg_cron extension — enable it first in
--    Supabase Dashboard → Database → Extensions → pg_cron
-- ============================================================

SELECT cron.schedule(
  'auto-notify-completed-matches',   -- job name (unique)
  '*/10 * * * *',                    -- every 10 minutes
  'SELECT auto_notify_completed_matches()'
);
