# Supabase (the backend)

There is no custom server in this repo. "Backend" means the Supabase-hosted
Postgres/Auth/Storage/Realtime project, defined by the SQL in this folder and
called from the frontend through `shared/services/`.

## Read this first

**These files are a record of what was pasted into the Supabase SQL editor, not
a replayable migration history.** Running the folder top to bottom in filename
order would install *older* versions of two functions over the current ones.
The order below is the real one.

There is no Supabase CLI setup here — no `config.toml`, no generated types. SQL
is applied by hand in the dashboard.

## Apply order

Run these in order against a fresh project:

| # | File | What it does |
|---|------|--------------|
| 1 | `migrations/0000_baseline_schema.sql` | Enums, 13 tables, RLS, storage, the participant-count trigger and the `adjust_match_player_count` RPC |
| 2 | `migrations/0001_constrain_enum_columns.sql` | CHECK constraints mirroring `shared/enums/` onto the five TEXT columns that had none |
| 3 | `rating_migration.sql` | `match_results` table + RLS; adds `elo_rating`/`peer_rating`/`elo_applied`; first EMA rating logic |
| 4 | `rating_precision.sql` | Widens the three rating columns to `NUMERIC(5,3)` |
| 5 | `rating_hardening.sql` | Adds the upward boost cap and rater-credibility weighting |
| 6 | `elo_trigger_fix.sql` | Fixes the Elo trigger |
| 7 | `rating_weight_by_reviews.sql` | **Authoritative** `update_player_rating` and `update_elo_rating` |
| 8 | `review_deadline.sql` | `enforce_review_deadline` — reviews close 7 days after kickoff |
| 9 | `auto_resolve_results.sql` | `disputed_at` column, `stamp_disputed_at`, nightly `auto_resolve_stale_results` |
| 10 | `match_completion_notifications.sql` | `notify_match_completion` + per-match scheduling |
| 11 | `match_confirmation.sql` | `confirmation_sent_at`, `send_match_confirmation_check`, `handle_match_completion`, nightly cleanup. Supersedes the scheduling trigger from step 10 |

## Which file owns which function

Several functions are defined in more than one file. Only the last one wins:

| Function | Authoritative file | Also appears in (older, do not re-run after) |
|---|---|---|
| `update_player_rating` | `rating_weight_by_reviews.sql` | `rating_migration.sql`, `rating_hardening.sql` |
| `update_elo_rating` | `rating_weight_by_reviews.sql` | `rating_migration.sql`, `elo_trigger_fix.sql` |
| `schedule_match_completion_notification` | `match_confirmation.sql` | `match_completion_notifications.sql` |

Editing the rating maths means editing `rating_weight_by_reviews.sql`. The
older copies carry "keep in sync" comments, but they are history — changing
them has no effect on a database that has had step 11 applied.

## The baseline is a reconstruction

`0000_baseline_schema.sql` was assembled from the SQL block in
`claude initial instructions.md` plus the parts that existed **only** in the
live project and in no file at all:

- the `user_reports` table
- `match_participants.extra_spots`, `extra_spots_opponent`, `rating_submitted`
- `matches.rating_notifications_sent`
- the `adjust_match_player_count` RPC
- the friendships / notifications / user_reports RLS policies
- the `avatars` storage bucket and its policies

Those sections are marked `[RECONSTRUCTED]` in the file. **Confirm them against
the live project once**, then correct the file and delete the markers:

```bash
supabase db dump --schema public -f live_schema.sql
# or
pg_dump --schema-only --schema=public "$DATABASE_URL" > live_schema.sql
```

## Enums

`shared/enums/` is the source of truth. Four values sets are real Postgres enum
types; the rest are TEXT + CHECK (see `0001`). Adding a value means changing
both the TypeScript enum and the constraint in the same commit — each enum
file's doc comment names its database counterpart.

## Scheduled jobs (pg_cron)

| Job | Schedule | Defined in |
|---|---|---|
| `auto-resolve-stale-results` | `0 2 * * *` | `auto_resolve_results.sql` |
| `cleanup-unconfirmed-matches` | `0 0 * * *` | `match_confirmation.sql` |
| `notify-match-<uuid>` | one-shot per match, self-unscheduling | `match_confirmation.sql` |

## Tests and simulations

Not part of the schema; safe to ignore when setting up a project.

- `test_*.sql` — rating/review scenarios run manually in the SQL editor
- `rating_sim.py`, `rating_tests_5v5.py`, `example_5v5_walkthrough.py` — offline
  models of the rating maths
- `RATING_EXAMPLE.md`, `RATING_TESTS.md` — worked examples

The rating system itself is documented in `../RATING_SYSTEM.md`.
