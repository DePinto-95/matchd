-- ============================================================
-- Rating precision: store to 3 decimals (.001)
-- Run in Supabase SQL Editor
--
-- The app DISPLAYS ratings at 1 decimal (.1) via toFixed(1),
-- but we want the underlying value stored at .001 so the small
-- Elo movements accumulate accurately instead of being rounded
-- away at .1 granularity.
--
-- NUMERIC(5,3) holds up to 99.999 — plenty for the 1.000–10.000
-- range — and Postgres rounds every write to 3 decimals.
-- ============================================================

ALTER TABLE player_ratings
  ALTER COLUMN rating      TYPE NUMERIC(5,3),
  ALTER COLUMN elo_rating  TYPE NUMERIC(5,3),
  ALTER COLUMN peer_rating TYPE NUMERIC(5,3);

-- Normalise any existing rows to 3 decimals
UPDATE player_ratings
   SET rating      = ROUND(rating, 3),
       elo_rating  = ROUND(elo_rating, 3),
       peer_rating = ROUND(peer_rating, 3);
