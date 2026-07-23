# MatchD — Ticket Backlog

Generated from a full code review of `web/` (pages, stores, hooks, components, Supabase SQL) on 2026-07-18.
Priorities: **P1** = bug / broken behavior, **P2** = missing feature that blocks a real flow, **P3** = improvement / cleanup.

---

## P1 — Bugs

### MD-01 · Leaving a match doesn't release opponent-side reserved spots — ✅ Fixed
**File:** `web/app/(app)/matches/[id]/page.tsx` (`handleLeave`)
The leave flow calls `adjust_match_player_count` with `-extra_spots` only. If the player also reserved spots on the opponent team (`extra_spots_opponent`), those stay counted in `current_players` forever, so the match shows phantom players and can wrongly stay/become `full`. CLAUDE.md documents the correct behavior: release `-(extra_spots + extra_spots_opponent)`.
**Fix:** `handleLeave` now sums `extra_spots + extra_spots_opponent` and passes the negative total to the RPC.

### MD-02 · Join capacity check ignores held ("reserved") spots — teams can be overbooked — ✅ Fixed
**File:** `web/app/(app)/matches/[id]/page.tsx` (`handleJoin`, join panel)
`handleJoin` counted team occupancy as the number of participant *rows* (`currentOnTeam`), and the join panel's `homeCount`/`awayCount`/`homeOpen`/`awayOpen` did the same. Neither included `extra_spots` or opponent-side `extra_spots_opponent` holds, so a team of 5 with 2 players + 3 held spots still showed 3 open slots and accepted new joins, overbooking the team.
**Fix:** extracted the squad panel's occupancy math into a shared `getTeamOccupancy(teamId, otherTeamId)` helper (own team's `1 + extra_spots` per row, plus `extra_spots_opponent` held by the other team's rows) and used it for `homeCount`/`awayCount` (join panel display) and the `handleJoin` capacity check.

### MD-03 · Full matches disappear from the home feed
**File:** `web/stores/matchStore.ts` (`fetchMatches`)
The upcoming query filters `.eq('status', 'open')`, so the moment a match flips to `full` it vanishes from the feed entirely. CLAUDE.md says the home feed should show `status IN ('open','full')` (full matches render with a "Full" badge — `MatchCard` already supports this).
**Fix:** change the filter to `.in('status', ['open', 'full'])`. Keep the existing client-side "hide fully-booked" filter on the home page or remove it deliberately — decide one behavior.

### MD-04 · Private matches: the invite-code join flow doesn't exist
**Files:** `web/app/(app)/matches/[id]/page.tsx`, `web/stores/friendStore.ts` (`sendMatchInvites`)
An `invite_code` is generated at creation and shown in the share text, but there is no way to *use* it: non-participants viewing a private match just see a disabled "Invite Only" button, and there's no code-entry UI anywhere. Worse, `sendMatchInvites` to friends doesn't include the code in the notification `data`, so even an explicitly invited friend cannot join a private match.
**Fix:** (a) add a "Have an invite code?" input on the private match page that unlocks the join panel when the code matches; (b) include `invite_code` in `match_invite` notification data and auto-unlock join when arriving via that notification (e.g. `?code=` query param).

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

### MD-09 · Test/dev artifacts shipped in the create wizard
**File:** `web/app/(app)/create/page.tsx`
The "⚡ Fill: 1 min test" button and the `1`-minute entry in `DURATIONS` are development helpers visible to every user.
**Fix:** remove them, or gate behind `process.env.NODE_ENV === 'development'`.

### MD-10 · `SPORTS[match.sport]` crashes on unknown sport values + duplicated color map
**File:** `web/components/match/MatchCard.tsx`
`sport.emoji` throws if the DB ever holds a sport value not in `SPORTS` (the page dies for the whole grid). Separately, `getSportColor` re-hardcodes every sport color inline, violating the project rule that all sport metadata lives in `constants/sports.ts` (the same colors already exist as `SPORTS[x].color`).
**Fix:** fall back to `SPORTS.other` when lookup fails; delete `getSportColor` and use `SPORTS[...].color`.

### MD-11 · Cancelled matches show up in "Recent Matches"
**File:** `web/hooks/useProfile.ts`
`playedCounts` correctly skips cancelled matches, but `matchHistory` (rendered as "Recent Matches" on profile pages) includes them — including matches auto-cancelled by `auto_cleanup_unconfirmed_matches`.
**Fix:** filter `status !== 'cancelled'` from history (or show a "Cancelled" badge deliberately).

### MD-12 · Docs/code mismatch: default rating is 2.0 in SQL, 5.0 in CLAUDE.md
**Files:** `CLAUDE.md`, `web/supabase/*.sql`
CLAUDE.md says player ratings default to 5.0/10; every SQL seed (`update_player_rating`, `update_elo_rating`) and the join-gate fallback in the match page use 2.0. Whichever is intended, align the other — the join gate (`min_rating`) behaves very differently for new players depending on this.

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

### MD-22 · Duplicated UI blocks
- The Ratings card is copy-pasted between `profile/page.tsx` and `players/[id]/page.tsx` → extract `<RatingsCard />`.
- The friend-search result row (Add/Pending/Accept/Friends button logic) is duplicated between `friends/page.tsx` and `friends/invite/page.tsx` → extract `<PlayerSearchRow />`.
- Home and Discover are ~80% identical; consider folding the search box into Home and dropping Discover, or extracting a shared `<MatchGrid />`.

### MD-23 · Native `confirm()` dialogs
Leave/cancel flows use browser `confirm()`, which clashes with the app's styling and is blocked in some embedded contexts. Replace with a small styled confirm modal component.

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
