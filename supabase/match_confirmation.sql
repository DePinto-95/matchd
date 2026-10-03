-- ============================================================
-- Match Confirmation Flow
-- Run this in Supabase SQL Editor AFTER match_completion_notifications.sql
-- ============================================================


-- ============================================================
-- 1. Add confirmation_sent_at to matches
--    Tracks when the creator was asked "did it happen?"
-- ============================================================

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ;


-- ============================================================
-- 2. send_match_confirmation_check
--    Sends a 'match_happened_check' notification to the match
--    creator when the match ended without filling up.
--    Sets confirmation_sent_at so the cleanup job can track
--    the 7-day response window.
-- ============================================================

CREATE OR REPLACE FUNCTION send_match_confirmation_check(p_match_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_creator_id UUID;
  v_title      TEXT;
  v_sport      TEXT;
BEGIN
  SELECT creator_id, title, sport
  INTO v_creator_id, v_title, v_sport
  FROM matches WHERE id = p_match_id;

  INSERT INTO notifications (user_id, type, title, body, data, read)
  VALUES (
    v_creator_id,
    'match_happened_check',
    'Did your match happen?',
    v_title || ' was scheduled — did it actually take place?',
    jsonb_build_object('match_id', p_match_id, 'sport', v_sport),
    FALSE
  );

  UPDATE matches SET confirmation_sent_at = NOW() WHERE id = p_match_id;

  -- Self-cleanup
  BEGIN
    PERFORM cron.unschedule('notify-match-' || p_match_id::text);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;


-- ============================================================
-- 3. handle_match_completion
--    Entry point called by the per-match cron job.
--    Branches based on match status at the time it fires:
--      - cancelled              → no-op, remove job
--      - open (never filled up) → ask creator if it happened
--      - full / in_progress     → notify all participants
-- ============================================================

CREATE OR REPLACE FUNCTION handle_match_completion(p_match_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM matches WHERE id = p_match_id;

  IF v_status = 'cancelled' THEN
    BEGIN
      PERFORM cron.unschedule('notify-match-' || p_match_id::text);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN;
  END IF;

  IF v_status = 'open' THEN
    PERFORM send_match_confirmation_check(p_match_id);
  ELSE
    -- full, in_progress, completed
    PERFORM notify_match_completion(p_match_id);
  END IF;
END;
$$;


-- ============================================================
-- 4. UPDATE schedule_match_completion_notification trigger
--    Now schedules handle_match_completion (not notify directly)
--    so the branch happens at fire time with the real status.
-- ============================================================

CREATE OR REPLACE FUNCTION schedule_match_completion_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_end_time  TIMESTAMPTZ;
  v_job_name  TEXT;
  v_cron_expr TEXT;
BEGIN
  v_end_time := NEW.scheduled_at + (NEW.duration_minutes || ' minutes')::INTERVAL;

  IF v_end_time <= NOW() THEN
    RETURN NEW;
  END IF;

  v_job_name := 'notify-match-' || NEW.id::text;

  v_cron_expr :=
    EXTRACT(MINUTE FROM v_end_time AT TIME ZONE 'UTC')::INT::TEXT || ' ' ||
    EXTRACT(HOUR   FROM v_end_time AT TIME ZONE 'UTC')::INT::TEXT || ' ' ||
    EXTRACT(DAY    FROM v_end_time AT TIME ZONE 'UTC')::INT::TEXT || ' ' ||
    EXTRACT(MONTH  FROM v_end_time AT TIME ZONE 'UTC')::INT::TEXT || ' *';

  PERFORM cron.schedule(
    v_job_name,
    v_cron_expr,
    format('SELECT handle_match_completion(%L::uuid)', NEW.id)
  );

  RETURN NEW;
END;
$$;

-- Trigger already exists — recreating picks up the updated function body.
DROP TRIGGER IF EXISTS schedule_match_notification ON matches;
CREATE TRIGGER schedule_match_notification
  AFTER INSERT ON matches
  FOR EACH ROW
  EXECUTE FUNCTION schedule_match_completion_notification();


-- ============================================================
-- 5. auto_cleanup_unconfirmed_matches  (daily cron)
--    Cancels matches where the creator never responded within
--    7 days of receiving the "did it happen?" notification.
-- ============================================================

CREATE OR REPLACE FUNCTION auto_cleanup_unconfirmed_matches()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE matches
  SET status = 'cancelled'
  WHERE status = 'open'
    AND confirmation_sent_at IS NOT NULL
    AND confirmation_sent_at + INTERVAL '7 days' < NOW();
END;
$$;

-- Schedule daily at midnight UTC
SELECT cron.schedule(
  'cleanup-unconfirmed-matches',
  '0 0 * * *',
  'SELECT auto_cleanup_unconfirmed_matches()'
);
