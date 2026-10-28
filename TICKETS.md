# MatchD — Ticket Backlog

Generated from a full code review of `web/` (pages, stores, hooks, components, Supabase SQL) on 2026-07-18.
Priorities: **P1** = bug / broken behavior, **P2** = missing feature that blocks a real flow, **P3** = improvement / cleanup.

> **Note (2026-10-28):** `web/` was restructured — feature folders under
> `web/features/`, a data-access layer in `shared/services/`, one enum per file
> in `shared/enums/`, and the schema captured into `supabase/migrations/`. File
> paths in older tickets may be stale; see `CLAUDE.md` for the current layout.
> Closed as part of that work: MD-09, MD-10, MD-12, MD-22, MD-23.
> **MD-32** is the verification checklist for that work and should be worked
> through before anything is built on top of it.
> Still open and now easier to fix, because the queries live in one place:
> **MD-05** (unescaped PostgREST `.or()` search term — now a one-line fix in
> `profileService.search`), **MD-19** (swallowed Supabase errors) and **MD-20**
> (non-atomic squad-spot adjustments — every flow now goes through
> `participantService`, so moving them into a single RPC is a contained change).

---

## P1 — Bugs

### MD-32 · Verify the restructure — nothing has been run in a browser yet

**Do this before building anything new on top.** The 2026-10-28 restructure moved every page's state and queries. It passes `tsc --noEmit` and `next build`, but **no flow has been exercised in a browser**, and there is no test suite to catch a regression. This ticket is the checklist — tick items off and delete the ticket once it is clean.

Each item names what specifically changed, so if something misbehaves you know where to look.

#### A · Commands

- [ ] `npm install` from the **repo root** (npm workspaces — not from `web/`)
- [ ] `cd web && npx tsc --noEmit` — must be silent
- [ ] `cd web && npm run build` — must say "Compiled successfully"
- [ ] Boundary check returns **only** `web/proxy.ts` and `web/app/auth/callback/route.ts` — the command is in CLAUDE.md under "Frontend vs backend"
- [ ] `cd web && npm run dev` starts with no console errors

#### B · Database

- [x] Run the five `SELECT DISTINCT` queries at the top of `supabase/migrations/0001_constrain_enum_columns.sql` — *done 2026-10-28: `match_participants.status` = confirmed, `friendships.status` = accepted, `bookings` empty, `notifications.type` = match_happened_check / rate_players / match_completed. All allowed, nothing blocking.*
- [ ] `SELECT DISTINCT reason FROM user_reports;` — the one query not yet run. If it errors with "relation does not exist", the table must be created from the baseline **before** applying `0001`, because `0001` alters it. Check with `SELECT to_regclass('public.user_reports');` — null means missing.
- [ ] Apply `supabase/migrations/0001_constrain_enum_columns.sql` in the SQL editor. **Do not run `0000_baseline_schema.sql`** — it builds a schema from scratch and these tables already exist.
- [ ] Confirm the five constraints landed:
  ```sql
  SELECT conname, conrelid::regclass FROM pg_constraint
  WHERE conname LIKE '%_status_check'
     OR conname IN ('notifications_type_check', 'user_reports_reason_check');
  ```
- [ ] Diff `0000_baseline_schema.sql` against the real schema and delete the `[RECONSTRUCTED]` markers. `user_reports`, three `match_participants` columns, `matches.rating_notifications_sent`, the `adjust_match_player_count` RPC, most RLS policies and the avatars bucket were rebuilt from the TypeScript, not copied from SQL — they are unconfirmed until this is done. Dump with `supabase db dump --schema public -f live_schema.sql`.

#### C · Flows (needs two accounts)

**Auth** — `authService` / `profileService` replaced the direct `supabase.auth` calls
- [ ] Register; a `profiles` row appears with the right `account_type`
- [ ] Log out, log back in
- [ ] Forgot password → email link → set new password → redirected to login
- [ ] Click a reset link **while already logged in** — known bug MD-08, expected to fail. Confirm it is no worse than before.

**Profile** — split into `features/profile/`, storage moved to `storageService`
- [ ] Upload an avatar; it appears in the header *and* the Navbar
- [ ] Remove the photo from the ⋮ menu; falls back to the default silhouette
- [ ] Edit name / username / bio / location and save
- [ ] Try a username that already exists — must say "Username already taken", not a generic failure
- [ ] Reopen the edit modal; fields are repopulated from the saved profile *(the modal owns its own field state now, not the page)*

**Create a match** — four step components, submit behind `matchService.createWithTeams`
- [ ] Walk all four steps; progress dots and "Step N of 4" track correctly
- [ ] Continue with no sport selected shows an error
- [ ] Continue with empty title/location shows field errors
- [ ] Step 3 rejects `31/02/2027`, a past date, and a date more than a year ahead
- [ ] Step 4 rejects min rating greater than max rating
- [ ] After creating, check Supabase for **all three**: the `matches` row, **both** `match_teams` rows, and your `match_participants` row. A partial result is MD-19/MD-20 territory.
- [ ] The "⚡ Fill: 1 min test" button and the 1-minute duration appear in `npm run dev` and are **absent** from a production build (MD-09)

**Join / leave with squad spots** — `participantService`, occupancy maths in `features/matches/lib/occupancy.ts`
- [ ] Second account joins; counter and team slots update
- [ ] Join while reserving extra spots on your own team; the count includes them
- [ ] Use "+ Squad" to reserve spots on the **opponent** team as well
- [ ] Reopen "+ Squad" — the steppers start from what you already hold, not from 1 *(the panel re-reads props each time it opens)*
- [ ] Fill one team completely; the other account can no longer pick that side
- [ ] Leave the match — **all** reserved spots release and `current_players` returns to the correct number (MD-01)
- [ ] A full upcoming match vanishes from Home for non-participants but stays visible to players in it (MD-03)

**Private matches**
- [ ] Open one as a non-participant → "Enter Invite Code"
- [ ] A wrong code is rejected; the correct one unlocks the join panel
- [ ] Share to a friend, then join from the notification — the link carries `?code=`

**Friends** — `PlayerSearch` / `usePlayerSearch` / `useFriendActions` are now shared by two pages
- [ ] Search on `/friends` → Find People **and** on `/friends/invite`; both must behave identically
- [ ] Send a request; the other account's Navbar badge updates live
- [ ] Accept, then remove the friend
- [ ] Buttons show the right state per person: Add / Pending / Accept / Friends
- [ ] Search a term containing `,` `(` `)` or an apostrophe — known bug MD-05, expect no results

**Notifications** — row extracted, routing is now a per-type table
- [ ] Each type navigates correctly: friend request → `/friends`; match invite → the match; match completed → the match; "did it happen" → the match
- [ ] A `result_disputed` notification does nothing on click — known bug MD-06
- [ ] Mark read, mark unread, dismiss, Mark all read, Clear read, Clear all

**Past match: result and rating** — `MatchResultSection` and `features/rate/`
- [ ] Creator sees "Did this match happen?" and can answer either way
- [ ] Submit a result; the other account sees it and can Accept or Dispute
- [ ] Dispute with a counter score; the first account can Accept or Reject
- [ ] Rate players; scores save, and **reloading the page restores them** *(resume path moved to `ratingService.listSubmittedScores`)*
- [ ] "Done" only enables once every assigned player is rated or skipped
- [ ] Revisiting after Done shows "Ratings submitted"
- [ ] Check `player_ratings` actually moved for a rated player

**Confirm dialogs** (MD-23) — all three must show the styled modal, never a browser popup
- [ ] Leave match
- [ ] Cancel match, as creator
- [ ] "No, it didn't" on the match-happened prompt

**Feeds**
- [ ] Home and Discover show the same matches for the same filters *(they share `MatchGrid` and `filterVisibleMatches` now)*
- [ ] Sport filter chips work on both
- [ ] The History toggle switches to past matches
- [ ] Discover's text search matches title, location and venue name
- [ ] A full match's card reads "Full" in red, not "0 spots" in orange (MD-31)

**Venue account**
- [ ] Log in as a `venue` account; `/venues/dashboard` loads
- [ ] A `player` account is blocked from it
- [ ] Confirm/decline a booking — needs a `bookings` row inserted by hand, since that table is empty and has no UI (MD-13)

#### D · Deliberately left broken

Not regressions from the restructure. These are tracked and were intentionally not fixed inside refactor commits, to keep those commits reviewable: **MD-05** (search filter), **MD-06** (disputed notification click), **MD-07** (registration error handling), **MD-08** (reset link while logged in), **MD-11** (cancelled matches in Recent Matches), **MD-19** (swallowed errors), **MD-20** (non-atomic spot updates), **MD-24** (result channel always subscribes).


### MD-01 · Leaving a match doesn't release opponent-side reserved spots — ✅ Fixed
**File:** `web/app/(app)/matches/[id]/page.tsx` (`handleLeave`)
The leave flow calls `adjust_match_player_count` with `-extra_spots` only. If the player also reserved spots on the opponent team (`extra_spots_opponent`), those stay counted in `current_players` forever, so the match shows phantom players and can wrongly stay/become `full`. CLAUDE.md documents the correct behavior: release `-(extra_spots + extra_spots_opponent)`.
**Fix:** `handleLeave` now sums `extra_spots + extra_spots_opponent` and passes the negative total to the RPC.

### MD-02 · Join capacity check ignores held ("reserved") spots — teams can be overbooked — ✅ Fixed
**File:** `web/app/(app)/matches/[id]/page.tsx` (`handleJoin`, join panel)
`handleJoin` counted team occupancy as the number of participant *rows* (`currentOnTeam`), and the join panel's `homeCount`/`awayCount`/`homeOpen`/`awayOpen` did the same. Neither included `extra_spots` or opponent-side `extra_spots_opponent` holds, so a team of 5 with 2 players + 3 held spots still showed 3 open slots and accepted new joins, overbooking the team.
**Fix:** extracted the squad panel's occupancy math into a shared `getTeamOccupancy(teamId, otherTeamId)` helper (own team's `1 + extra_spots` per row, plus `extra_spots_opponent` held by the other team's rows) and used it for `homeCount`/`awayCount` (join panel display) and the `handleJoin` capacity check.

### MD-03 · Full matches disappear from the home feed — ✅ Fixed
**Files:** `web/stores/matchStore.ts` (`fetchMatches`), `web/app/(app)/page.tsx`, `web/app/(app)/discover/page.tsx`
The upcoming query filtered `.eq('status', 'open')`, so the moment a match flipped to `full` it vanished from the feed entirely — even for players still in it.
**Fix:** the store now fetches `status IN ('open','full')` for upcoming matches. Chosen behavior (deliberate, not CLAUDE.md's "always show Full with a badge"): a full upcoming match is only shown to players who are already participants in it — everyone else it stays hidden from, since they can't join it anyway. Applied consistently on both Home and Discover (they share `matchStore`, so Discover needed the same participant-aware filter to avoid newly surfacing other people's full matches).

### MD-04 · Private matches: the invite-code join flow doesn't exist — ✅ Fixed
**Files:** `web/app/(app)/matches/[id]/page.tsx`, `web/stores/friendStore.ts` (`sendMatchInvites`), `web/app/(app)/notifications/page.tsx`
An `invite_code` is generated at creation and shown in the share text, but there is no way to *use* it: non-participants viewing a private match just see a disabled "Invite Only" button, and there's no code-entry UI anywhere. Worse, `sendMatchInvites` to friends doesn't include the code in the notification `data`, so even an explicitly invited friend cannot join a private match.
**Fix:** (a) the "Invite Only" disabled button is now "Enter Invite Code", which opens a small panel with a text input; entering the correct code sets a `codeVerified` flag that unlocks the normal join panel/flow. (b) `sendMatchInvites` now includes `invite_code` in the `match_invite` notification's `data`; the notifications page routes to `/matches/{id}?code={invite_code}` when present, and the match page auto-verifies against that query param on load.

### MD-05 · Free-text search breaks the PostgREST `.or()` filter
**Files:** `web/app/(app)/friends/page.tsx`, `web/app/(app)/friends/invite/page.tsx`
The search term is interpolated raw into `.or(\`username.ilike.%${search}%,full_name.ilike.%${search}%\`)`. A search containing `,`, `(`, `)`, or `.` corrupts the filter expression and the query errors (silently — results just go empty).
**Fix:** strip/escape PostgREST-reserved characters from the term before interpolating (or use two `.ilike` queries merged client-side).

### MD-06 · `result_disputed` notifications are dead on click
**File:** `web/app/(app)/notifications/page.tsx`
The match page inserts `result_disputed` notifications, but the notifications page has no branch for that type: no icon, and clicking does nothing (it should navigate to the match so the user can respond to the dispute).
**Fix:** handle `result_disputed` like `match_completed` (navigate to `/matches/{match_id}`, warning icon).

### MD-07 · Registration swallows failures (duplicate username, email confirmation)
**File:** `web/app/auth/register/page.tsx`
1. The `profiles` upsert result is never checked — a duplicate username (unique constraint) fails silently, and `authStore.fetchProfile` later invents a `user_xxxxxx` fallback username. There's also no pre-check that the username is free.
2. If Supabase email confirmation is enabled, `signUp` returns a user but no session; the page still toasts "Account created!" and pushes to `/`, where the proxy bounces the user to login with zero explanation.
**Fix:** check username availability before `signUp` (or surface the 23505), and branch on `authData.session === null` to show a "check your email to confirm" screen.

### MD-08 · Password-reset link breaks for already-logged-in users
**File:** `web/proxy.ts`
A logged-in user who clicks a reset-password email link hits `/auth/callback`, which the proxy redirects to `/` (rule: authed users are pushed off all `/auth` routes except `/auth/reset-password`) — before the PKCE code exchange runs. The reset flow dies.
**Fix:** also exempt `/auth/callback` from the authed-user redirect.

### MD-09 · Test/dev artifacts shipped in the create wizard — ✅ Fixed
**Files:** `web/features/create/lib/constants.ts`, `web/features/create/components/StepSchedule.tsx`
The "⚡ Fill: 1 min test" button and the `1`-minute entry in `DURATIONS` were development helpers visible to every user.
**Fix:** both are gated behind `IS_DEV` (`process.env.NODE_ENV === 'development'`) rather than deleted — they are what makes the post-match rating and result flows testable at all. `DURATIONS` omits the 1-minute option in production builds.

### MD-10 · `SPORTS[match.sport]` crashes on unknown sport values + duplicated color map — ✅ Fixed
**File:** `web/features/matches/components/MatchCard.tsx`
`sport.emoji` threw if the DB ever held a sport value not in `SPORTS`, taking down the whole grid. Separately, `getSportColor` re-hardcoded every sport color inline, duplicating `SPORTS[x].color`.
**Fix:** `SPORTS[match.sport] ?? SPORTS[SportType.Other]`, and `getSportColor` deleted in favour of `sport.color`. The card also now uses the shared `getMatchOccupancy` helper instead of its own copy of the occupancy reduce.

### MD-11 · Cancelled matches show up in "Recent Matches"
**File:** `web/hooks/useProfile.ts`
`playedCounts` correctly skips cancelled matches, but `matchHistory` (rendered as "Recent Matches" on profile pages) includes them — including matches auto-cancelled by `auto_cleanup_unconfirmed_matches`.
**Fix:** filter `status !== 'cancelled'` from history (or show a "Cancelled" badge deliberately).

### MD-12 · Docs/code mismatch: default rating is 2.0 in SQL, 5.0 in CLAUDE.md — ✅ Fixed
**Files:** `CLAUDE.md`, `supabase/migrations/0000_baseline_schema.sql`, `shared/services/ratingService.ts`
CLAUDE.md said player ratings default to 5.0/10; every SQL seed and the join-gate fallback used 2.0.
**Fix:** 2.0 is correct and the docs were wrong. CLAUDE.md now says so explicitly, the baseline migration records it with a note, and the fallback is a single named constant, `DEFAULT_RATING` in `ratingService`, instead of a `2.0` literal in the match page.

### MD-31 · Match detail page & cards trust stale `status`/`current_players` instead of actual occupancy — ✅ Fixed
**Files:** `web/app/(app)/matches/[id]/page.tsx`, `web/components/match/MatchCard.tsx`
The match detail page rendered `match.status` and `match.current_players` directly. Both can lag behind reality: squad-spot reservations (`extra_spots`/`extra_spots_opponent`) go through the `adjust_match_player_count` RPC, which doesn't reliably flip `matches.status` to `full` (the same drift MD-20 describes). A team actually full at 10/10 could still show an "OPEN" badge and "9/10 players". `MatchCard` had the same root problem — its "Full" badge used `match.status === 'full'` even though the adjacent "X spots left" text was already computed from actual occupancy, so a fully-held team showed "0 spots" in orange (warning) instead of "Full" in red (error).
**Fix:** compute actual occupancy from `match_participants` (`1 + extra_spots + extra_spots_opponent` per row) everywhere fullness is displayed. On the detail page, `isFull` and the player count now use this, and the status badge shows "FULL" (derived from actual occupancy) even when the DB `status` column is still `open`. In `MatchCard`, `isFull` is now derived the same way instead of trusting `match.status`.

### MD-29 · Page navigation felt frozen, prompting manual reloads — ✅ Fixed
**Files:** `web/components/layout/Navbar.tsx`, `web/hooks/useRealtime.ts`, `web/app/(app)/loading.tsx` (new), `web/components/ui/PageLoading.tsx` (new)
Two compounding issues made in-app navigation feel broken: (1) every page under `app/(app)/` is a client component with no `loading.tsx`/pending-nav indicator anywhere, so clicks gave zero visual feedback while `proxy.ts`'s `getUser()` network round-trip and the route's RSC payload resolved — looked frozen, prompting reloads; (2) Navbar passed a new inline callback to `useNotificationRealtime` on every render, and Navbar re-renders on every route change (`usePathname`), so the notifications Realtime channel was torn down and resubscribed on every single navigation.
**Fix:** added a shared `<PageLoading />` spinner and a `loading.tsx` on the `(app)` route group (covers all nested routes since none define a more specific one); memoized the Navbar's realtime callback with `useCallback` so the channel subscribes once.

---

## P2 — Missing features

### MD-13 · Venue accounts have no real product surface
Venue owners can register, but: there is no UI to create/edit a `venues` row; the create-match wizard never sets `venue_id` (location is free text only); there is no player-side booking flow, so the venue dashboard's bookings list can never be populated from the app.
**Scope:** venue onboarding form (name, address, sports, amenities, logo/cover upload), venue picker in the create wizard, and a minimal "request booking" action that inserts a `bookings` row.

### MD-14 · Squads exist as a page but can't be created or used
`app/(app)/squads/[id]/page.tsx` and the `Squad`/`SquadMember` types exist, but nothing links to a squad and there is no create/manage UI. Either build squad creation + member management (and tie it into squad-spot reservations, which currently just hold anonymous slots), or delete the page until the feature is scheduled.

### MD-15 · Level/rank system (Levels card placeholder)
CLAUDE.md notes the level value is a `—` placeholder. The profile now shows raw ratings; implement the planned level/rank derivation (e.g. tiers from `player_ratings.rating`) and display it on profile + public player pages.

### MD-16 · Match editing for creators
A creator's only lever is Cancel. Allow editing time, location, description, and rating range before the match starts (with a notification to participants on change).

### MD-17 · Price per player in the create wizard
`matches.price_per_player`/`currency` exist and are rendered on cards and the detail page, but the wizard never asks — every match is Free. Add an optional price field (display only; no payment processing per project rules).

### MD-18 · Pagination / limits on feeds
`fetchMatches` fetches every match in the table with nested participants; the history toggle fetches all past matches ever. Add `.limit()` + "load more" (or range pagination), and consider doing the fully-booked filtering server-side.

### MD-30 · Reserve opponent-side spots when joining, not just after
**File:** `web/app/(app)/matches/[id]/page.tsx` (join panel / `handleJoin`)
The "Choose your side" join panel only lets a joining player reserve extra spots on their own team (`squadSpots` → `extra_spots`). Reserving spots on the *opponent* team (`extra_spots_opponent`) is currently only possible after joining, via the creator-only squad panel. A player who wants to bring people for both sides (e.g. organizing a friendly where they're bringing both squads) has to join first, then separately open the squad panel to add opponent spots.
**Scope:** add an "Also reserve spots for the opposing team?" stepper to the join panel alongside the existing own-team spot counter, capped by `opponentOpenSlots`. Pass the value as `extra_spots_opponent` on the initial `match_participants` insert and include it in the `adjust_match_player_count` delta in `handleJoin` (currently only `extraSpots` is applied).

---

## P3 — Improvements & cleanup

### MD-19 · Swallowed Supabase errors throughout
Many mutations ignore `error` entirely: `handleLeave`, `handleCancelMatch`, `handleConfirmMatchHappened`, match-team inserts in the create flow (a failed `match_teams` insert leaves a broken match with no teams), `markAllAsRead` (updates local state even if the DB update failed), `fetchMatches`/`fetchMatchById` (errors render as "no matches"). Audit and surface failures with toasts; for creation, consider a single RPC that creates match + teams + creator participant atomically.

### MD-20 · Squad-spot adjustments are not atomic
Join/leave/update flows do participant INSERT/UPDATE/DELETE then a *separate* `adjust_match_player_count` RPC. If the second call fails (network, RLS), `current_players` drifts permanently. Move each flow into one RPC that does both in a transaction; also have the DB trigger release held spots on participant DELETE so clients can't forget.

### MD-21 · No lint/typecheck tooling
`package.json` has no `lint` script and no ESLint dependency (yet the code carries `eslint-disable` comments). Add ESLint (flat config) + `tsc --noEmit` script, and ideally a GitHub Actions workflow running both plus `next build` on push.

### MD-22 · Duplicated UI blocks — ✅ Fixed
- Ratings card → `features/profile/components/RatingsCard.tsx`, used by both the own-profile and public player pages (−42 lines on the latter). The repeated `5` unlock threshold is now `MATCHES_TO_UNLOCK_RATING`.
- Friend-search result row → `features/friends/components/PlayerSearchRow.tsx`, inside a `PlayerSearch` component that also owns the input, skeleton and empty state, so both pages share the whole block. The debounce and the five request actions became `usePlayerSearch` and `useFriendActions`.
- Home and Discover → shared `features/matches/components/MatchGrid.tsx`; Discover was kept (it has the search box) rather than dropped. The "hide full upcoming matches unless you're in them" filter, which was duplicated and re-implemented the occupancy maths a third time, is now `filterVisibleMatches`.

Further duplication removed while in there: `PersonRow` (the avatar/name/handle row, 4 copies on the friends page alone), `EmptyState`, `SkeletonRows`, `ScoreInput` (the Home–Away entry pair, verbatim twice in the match result flow), `RateSection`/`RatePlayerRow`, `RateClosedScreen`, and `ui/BackButton` (copy-pasted across five pages).

### MD-23 · Native `confirm()` dialogs — ✅ Fixed
**Files:** `web/components/ui/ConfirmDialog.tsx`, `web/features/matches/hooks/useMatchDetail.ts`
Leave, cancel-match and "it didn't happen" used browser `confirm()`.
**Fix:** `useMatchDetail` holds a pending-confirmation descriptor (title, message, label, action) that the page renders as a `ConfirmDialog`, so all three flows stay in one place and each gets a real explanation instead of "Continue?".

### MD-24 · `match_results` realtime channel subscribes on every match visit
`useMatchResult` opens INSERT/UPDATE subscriptions the moment any match detail page mounts, including future matches where no result can exist. Gate the subscription on `isPast && isParticipant`.

### MD-25 · `in_progress` status is never used
The lifecycle documents `open → full → in_progress → completed/cancelled`, but nothing ever sets `in_progress`. Either set it (e.g. the pg_cron completion job, or derive client-side between start and end) or drop it from the type and docs.

### MD-26 · Dead filter: `filters.city`
`matchStore` carries a `city` filter that no query uses and no UI sets. Wire it up (venue city / location match) or remove it.

### MD-27 · Zod v4 deprecations
`z.string().email()` is deprecated in Zod 4 (project uses `zod@^4.4.3`) — switch to `z.email()` in login/register schemas.

### MD-28 · Venue accounts appear in player search
"Find People" and invite search return `venue` profiles as if they were players (friend requests, match invites). Filter `account_type = 'player'` — or define what befriending a venue means.
