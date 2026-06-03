-- ============================================================
-- Match Completion Notifications
-- Run this in Supabase SQL Editor
--
-- Requires pg_cron:
--   Dashboard → Database → Extensions → pg_cron → Enable
-- ============================================================


-- ============================================================
-- 1. notify_match_completion
--    Sends a 'match_completed' notification to every confirmed
--    participant, marks the match so it won't fire again, then
--    self-unschedules its own cron job.
-- ============================================================

CREATE OR REPLACE FUNCTION notify_match_completion(p_match_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_title           TEXT;
  v_sport           TEXT;
  v_already_sent    BOOLEAN;
  v_pid             UUID;
BEGIN
  SELECT title, sport, rating_notifications_sent
  INTO v_title, v_sport, v_already_sent
  FROM matches WHERE id = p_match_id;

  -- Guard: don't double-send
  IF v_already_sent THEN RETURN; END IF;

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

  -- Self-cleanup: remove the one-time cron job
  BEGIN
    PERFORM cron.unschedule('notify-match-' || p_match_id::text);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;


-- ============================================================
-- 2. schedule_match_completion_notification  (trigger function)
--    Called on every match INSERT. Schedules a one-time pg_cron
--    job to fire at scheduled_at + duration_minutes (UTC).
--    Jobs whose end time is already in the past are skipped.
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

  -- Build a cron expression from the UTC end timestamp
  -- Format: "minute hour day month *"  → fires once then repeats yearly,
  -- but notify_match_completion self-unschedules on first run.
  v_cron_expr :=
    EXTRACT(MINUTE FROM v_end_time AT TIME ZONE 'UTC')::INT::TEXT || ' ' ||
    EXTRACT(HOUR   FROM v_end_time AT TIME ZONE 'UTC')::INT::TEXT || ' ' ||
    EXTRACT(DAY    FROM v_end_time AT TIME ZONE 'UTC')::INT::TEXT || ' ' ||
    EXTRACT(MONTH  FROM v_end_time AT TIME ZONE 'UTC')::INT::TEXT || ' *';

  PERFORM cron.schedule(
    v_job_name,
    v_cron_expr,
    format('SELECT notify_match_completion(%L::uuid)', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS schedule_match_notification ON matches;
CREATE TRIGGER schedule_match_notification
  AFTER INSERT ON matches
  FOR EACH ROW
  EXECUTE FUNCTION schedule_match_completion_notification();


-- ============================================================
-- 3. unschedule_match_notification  (trigger function)
--    When a match is cancelled, removes the pending cron job
--    so the notification is never sent.
-- ============================================================

CREATE OR REPLACE FUNCTION unschedule_match_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('notify-match-' || NEW.id::text);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS unschedule_on_cancel ON matches;
CREATE TRIGGER unschedule_on_cancel
  AFTER UPDATE ON matches
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
  EXECUTE FUNCTION unschedule_match_notification();
