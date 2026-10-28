# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**MatchD** — a platform where players create and join sports matches with strangers or friends. Supports football, mini football (5v5/8v8), padel, tennis, basketball, volleyball. Two account types: `player` and `venue` (sports centers).

## Folder Structure

```
MatchD/
├── web/        ← ACTIVE PROJECT (Next.js web app)
├── matchd/     ← Reference only (original React Native/Expo app, not in active development)
├── shared/     ← @matchd/shared — code reused by both frontends (see "Shared code" below)
└── supabase/   ← The actual backend: SQL schema, RLS policies, triggers, migrations
```

This is an npm workspaces monorepo (root `package.json` lists `web`, `matchd`, `shared`). All active development happens in `web/`. The `matchd/` folder is kept as a reference for when the mobile app is built later. There is no custom server anywhere in this repo — "backend" means the Supabase-hosted Postgres/Auth/Storage/Realtime service, defined by the SQL files in `supabase/` and called directly from frontend code via the Supabase JS client.

## Commands

```bash
# Install deps — run from the repo root (npm workspaces), not from web/
npm install

# Everything else still runs from web/
cd web
npm run dev     # start dev server
npm run build   # build for production
```

## Shared code (`shared/`)

`@matchd/shared` is an npm workspace package holding code with zero framework dependency — safe to use from both the Next.js app and the Expo/React Native app:
- `shared/enums` — **one file per enum**, plus an `index.ts` barrel (see "Enums" below)
- `shared/types` — DB/domain TypeScript types, split one file per domain (`match.ts`, `profile.ts`, `friend.ts`, …). `index.ts` re-exports every type *and* every enum, so `@matchd/shared/types` remains a single valid entry point
- `shared/constants` — `sports.ts`, `theme.ts`
- `shared/lib/helpers.ts` — pure date/string/formatting helpers
- `shared/services` — **the data-access layer** (see "Frontend vs backend" below)
- `shared/stores` — zustand store **factories** (`createAuthStore(supabase)`, `createMatchStore(supabase, options)`, `createNotificationStore(supabase)`). Each app's own `stores/*.ts` is a 2-3 line wrapper that injects its own platform-specific Supabase client (and, for `web`, a `sonner` toast callback) and exports the bound hook.

UI components are **not** shared — every `matchd/components/*` file imports React Native primitives (`View`, `Text`, etc.) directly, which have no DOM equivalent. Sharing components would require adopting a cross-platform UI layer (react-native-web, Tamagui, …); that's a separate decision, not needed while `matchd/` stays reference-only.

**Rule:** types, constants, and pure business logic shared by both apps belong in `shared/` — never duplicate them back into `web/` or `matchd/`. Import via the package name (e.g. `@matchd/shared/constants/sports`), not a relative path.

## Architecture (`web/`)

### Where code goes

```
web/
├── app/           ← routing only. A page.tsx composes components; it holds no
│                    queries and little state. Most are 50-100 lines.
├── features/      ← one folder per feature, each with its own
│   │                components/, hooks/ and lib/
│   ├── matches/   ← match detail, cards, the feed grid, occupancy maths
│   ├── create/    ← the four-step wizard
│   ├── profile/   ← own profile + the RatingsCard shared with player profiles
│   ├── friends/   ← friends list, requests, player search
│   ├── players/   ← public player profile, report modal
│   ├── rate/      ← post-match rating
│   └── notifications/ ← row rendering + the per-type icon/route table
├── components/    ← only genuinely cross-feature UI
│   ├── ui/        ← Button, Input, Avatar, Badge, Modal-ish dialogs, pickers
│   ├── layout/    ← Navbar
│   └── providers/ ← AuthProvider
├── services/      ← index.ts, wiring shared/services to the browser client
├── hooks/         ← cross-feature hooks only (useRealtime, useProfile, ...)
├── lib/           ← supabase clients, reviewAssignment
└── stores/        ← thin wrappers over shared/stores factories
```

**Which folder?** UI used by one feature goes in that feature. UI used by two or
more features goes in `components/ui/`. Anything that talks to the database goes
in `shared/services/` — see "Frontend vs backend" below.

A feature folder has an `index.ts` barrel, so
`import { MatchHero } from '@/features/matches/components'` works.

### Routing — Next.js 16 App Router (file-based)
- `app/(app)/` — authenticated pages (wrapped with Navbar)
- `app/(app)/page.tsx` — home feed (upcoming matches)
- `app/(app)/discover/page.tsx` — same feed plus a free-text search box
- `app/(app)/create/page.tsx` — multi-step match creation wizard
- `app/(app)/matches/[id]/page.tsx` — match detail, team slots, join/leave flow
- `app/(app)/matches/[id]/rate/page.tsx` — post-match player rating
- `app/(app)/profile/page.tsx` — own profile (avatar upload, edit modal, levels, ratings, recent matches)
- `app/(app)/players/[id]/page.tsx` — public player profile (friend actions, report)
- `app/(app)/venues/[id]/page.tsx` — public venue page
- `app/(app)/venues/dashboard/page.tsx` — venue owner's bookings list
- `app/(app)/squads/[id]/page.tsx` — squad detail (no create/manage UI yet, MD-14)
- `app/(app)/notifications/page.tsx` — notification list (click navigates to match or /friends)
- `app/(app)/friends/page.tsx` — friends list, pending requests, find people search
- `app/(app)/friends/invite/page.tsx` — search existing players + shareable invite link
- `app/auth/login/page.tsx` — login
- `app/auth/register/page.tsx` — register
- `app/auth/forgot-password/page.tsx` — request password reset email
- `app/auth/reset-password/page.tsx` — set new password (after email link)
- `app/auth/callback/route.ts` — Supabase auth callback (exchanges PKCE code for session)

**Next.js 16 note**: `middleware.ts` is renamed to `proxy.ts`, exported function is `proxy()` not `middleware()`.

### Backend — Supabase
- Browser client: `lib/supabase/client.ts` (uses `createBrowserClient` from `@supabase/ssr`) — imported only by `web/services/index.ts` and the store wrappers
- Server client: `lib/supabase/server.ts` — for Server Components, currently unused. `app/auth/callback/route.ts` deliberately does **not** use it: that route must set cookies on a redirect response it builds itself, which the `next/headers` cookie store cannot do.
- The schema lives in `supabase/` — start at `supabase/README.md`, which gives the apply order and warns that the folder is not replayable in filename order.
- All DB operations go through the Supabase JS client — no separate API layer.

Key tables:
- `profiles` — extends `auth.users`; `account_type: 'player' | 'venue'`; editable fields: `full_name`, `username`, `bio`, `location`, `avatar_url`
- `matches` — status lifecycle: `open → full → in_progress → completed/cancelled`
- `match_participants` — DB trigger auto-increments `matches.current_players` and flips status to `full` when at capacity. Key columns: `extra_spots` (reserved spots on own team), `extra_spots_opponent` (reserved spots on opponent team)
- `match_teams` — `home`/`away` rows per match; participants reference a team
- `player_ratings` — one row per `(player_id, sport)`; DB trigger recalculates weighted rolling average on each `match_ratings` insert. **Ratings start at 2.0/10**, not 5.0 — this doc said 5.0 for a long time and was wrong (MD-12); every SQL seed uses 2.0, and matches gate joining on `min_rating`
- `venues` — owned by `venue` accounts; matches link via `venue_id`
- `friendships` — `requester_id`, `addressee_id`, `status: 'pending' | 'accepted' | 'blocked'`. Unique constraint on (requester_id, addressee_id). RLS: both parties can SELECT/DELETE; only addressee can UPDATE (accept); only requester can INSERT.
- `notifications` — `user_id`, `type`, `title`, `body`, `data` (jsonb), `read`. Types are the `NotificationType` enum: `friend_request`, `friend_accepted`, `match_invite`, `match_completed`, `match_happened_check`, `result_disputed` (plus legacy `rate_players`). Constrained by a CHECK in `supabase/migrations/0001_constrain_enum_columns.sql`. RLS: any authenticated user can INSERT (needed to send notifications to others); users can only SELECT/UPDATE/DELETE their own.
- `user_reports` — `reporter_id`, `reported_id`, `reason`, `details`. Unique constraint prevents duplicate reports. No SELECT policy (admin only).

Custom DB functions:
- `adjust_match_player_count(p_match_id, p_delta)` — RPC to manually adjust `current_players` beyond what the INSERT/DELETE trigger handles (used for squad spot reservations)

### Storage — Supabase
- Bucket: `avatars` (public). Path pattern: `{userId}/avatar.{ext}`. Policies: authenticated users can INSERT/UPDATE/DELETE their own folder (matched via `storage.foldername(name)[1] = auth.uid()`); public SELECT for all.

### State — Zustand
Stores in `stores/`:
- `authStore.ts` — session, user, profile; `fetchProfile` bootstraps on auth change
- `matchStore.ts` — match list, filters, fetch helpers
- `notificationStore.ts` — notifications list, `unreadCount`, `fetchNotifications`, `markAsRead`, `deleteNotification`, `markAllAsRead`
- `friendStore.ts` — `friends`, `pendingIn`, `pendingOut`, `pendingInCount`; actions: `sendRequest`, `acceptRequest`, `declineRequest`, `cancelRequest`, `removeFriend`, `sendMatchInvites`, `reportUser`; `getRelation(userId)` returns a `FriendRelation` discriminated union

All four are 3-8 line wrappers that inject the browser Supabase client (and `sonner` toast callbacks) into a factory from `shared/stores/`.

### Realtime
Channels are opened by `shared/services/realtimeService.ts` (each subscribe returns its own teardown); `hooks/useRealtime.ts` is the React wrapper:
- `useMatchRealtime(matchId, onUpdate)` — subscribes to `match_participants` and `matches` changes
- `useNotificationRealtime(userId, onNew)` — subscribes to `notifications` INSERT events. **Only call this once per session** — it lives in the Navbar. Do NOT also call it from individual pages or Supabase will throw a duplicate channel error.

### Forms
React Hook Form + Zod for all forms. The create wizard's schema is in `features/create/lib/schema.ts`; Zod enums take the TS enum object directly (`z.enum(AccountType)`).

### Shared UI conventions
- `components/ui/PageLoading` — the page-level spinner. Don't hand-roll one.
- `components/ui/BackButton` — the "< Back" link above detail pages.
- `components/ui/ConfirmDialog` — use instead of the native `confirm()`, which ignores the app's styling and is blocked in some embedded contexts.
- `features/friends/components/{PersonRow,EmptyState,SkeletonRows}` — the avatar/name row, empty states and loading skeletons used across list pages.

### Styling — Tailwind CSS v4
Configured via `@import "tailwindcss"` and `@theme inline` in `app/globals.css` (no `tailwind.config.ts` needed).

Design tokens:
- Background: `#0a0a0f`, Surface: `#13131a`, Surface-alt: `#1c1c27`
- Brand: `#6c63ff`, Border: `#2a2a3d`, Text: `#f0f0ff`, Text-muted: `#8888aa`
- Success: `#22c55e`, Warning: `#f59e0b`, Error: `#ef4444`
- Fonts: Space Grotesk (headings), Inter (body)

### Sport Config
All sport metadata lives in `shared/constants/sports.ts` (imported as `@matchd/shared/constants/sports`). Reference `SPORTS[sport]` everywhere — never hardcode sport-specific values inline.

## Frontend vs backend

There is no separate API server, but there *is* a hard boundary in the code:

> **Only files under `shared/services/` may call `supabase.from()`, `.rpc()`, `.storage` or `.auth`.**

Everything else — pages, components, hooks, stores — goes through a service. This is the line between "frontend" (rendering and local state) and "backend" (talking to the database).

```ts
// ✅ a page or hook
import { matchService, participantService } from '@/services';
const match = await matchService.getById(id);
await participantService.leave(match.id, user.id, heldSpots);

// ❌ never, outside shared/services/
import { supabase } from '@/lib/supabase/client';
await supabase.from('matches').select('*');
```

Each service is a factory taking a Supabase client (`createMatchService(supabase)`), so the same code works for web and for the mobile app, which builds its client differently. `web/services/index.ts` wires every factory to the browser client once and exports ready-to-use singletons — that is the only file importing the client.

Services: `authService`, `profileService`, `matchService`, `participantService`, `matchResultService`, `ratingService`, `friendService`, `notificationService`, `reportService`, `storageService`, `venueService`, `squadService`, `realtimeService`.

Conventions:
- Reads return the data directly (`Match | null`, `Profile[]`).
- Writes return `{ error }` (or `{ data, error }`) rather than throwing, because callers surface errors as toasts. The one exception is a timeout, which throws `TimeoutError`.
- Stores build the services they need internally, so a store never touches Supabase either.

**Two deliberate exceptions**, both server-side auth that runs before any service exists: `web/proxy.ts` and `web/app/auth/callback/route.ts`.

Check the boundary at any time:

```bash
grep -rn "supabase\.\(from\|rpc\|storage\|auth\)" web/ shared/ --include=*.ts --include=*.tsx | grep -v "shared/services/"
```

## Enums

Every constrained set of values is a **real TypeScript `enum`, one per file**, in `shared/enums/` — never an inline string-literal union and never a bare string. Import from `@matchd/shared/enums`:

```ts
import { MatchStatus, TeamSide } from '@matchd/shared/enums';

if (match.status === MatchStatus.Open) { ... }
await supabase.from('matches').update({ status: MatchStatus.Cancelled });
```

Current enums: `SportType`, `AccountType`, `MatchStatus`, `TeamSide`, `MatchResultStatus`, `MatchWinnerSide`, `ParticipantStatus`, `FriendshipStatus`, `BookingStatus`, `NotificationType`, `ReportReason`, `FriendRelationKind`.

**Rules:**
- Never write the raw string (`'open'`, `'confirmed'`, `'player'`) anywhere — including inside `supabase.insert()`/`.update()`/`.eq()` calls, which are untyped and so will *not* be caught by the compiler.
- Each enum file's doc comment names its database counterpart. Keep the two in sync: adding a value means adding it to the DB `CHECK` constraint (or the Postgres enum type) in the same unit of work.
- `Record<SomeEnum, X>` maps use computed keys (`[SportType.Football]: …`) so the compiler enforces exhaustiveness — see `shared/constants/sports.ts`.
- Zod schemas take the enum object directly: `z.enum(AccountType)`.

Database counterparts: `sport_type`, `match_status`, `account_type` and `team_side` are real Postgres enum types. The rest are `TEXT` columns with a `CHECK (col IN (...))` constraint. `FriendRelationKind` is client-only (derived from `friendships` rows).

## Key Patterns

**Joining a match**: Insert into `match_participants` with `player_id = auth.uid()` and `extra_spots = squadSpots - 1`. The DB trigger handles `current_players` increment. Call `adjust_match_player_count` RPC for extra spots beyond the base insert.

**Squad spot reservations**: A participant has one row in `match_participants`. `extra_spots` reserves additional slots on their own team; `extra_spots_opponent` reserves slots on the opposing team. Both are tracked separately and adjusted via the RPC.

**Leaving a match**: DELETE the participant row (trigger decrements `current_players` by 1), then call RPC with `-(extra_spots + extra_spots_opponent)` to release all reserved spots.

**Match date validation**: Matches must be scheduled in the future and no more than 1 year ahead. Date input is `DD/MM/YYYY`, time is `HH:MM` (24h). Both auto-format as the user types.

**Rating system**: Ratings are never self-reported. After a match completes, players rate assigned teammates/opponents via `match_ratings`. The `update_player_rating` DB trigger recalculates the rolling average per review (no waiting for all reviews); the combined rating blends Elo and reviews weighted by reviews received (`min(0.6, n/(n+4))`). Reviews close 7 days after match start — enforced by the `enforce_review_deadline` trigger (`supabase/review_deadline.sql`) and mirrored by `isReviewWindowClosed` in `shared/lib/helpers.ts`. Skipped/missing reviews need no special handling: they simply leave more weight on Elo.

**Private matches**: Set `is_private = true` and share the `invite_code`. Join is only possible with the code.

**Password reset flow**: `resetPasswordForEmail` → email link → `/auth/callback` (exchanges PKCE code, sets session cookies on redirect response) → `/auth/reset-password` (calls `updateUser`, then `signOut`, redirects to login).

**Home feed filtering**: Default shows upcoming matches (`status IN ('open','full')` and `scheduled_at >= now`). A History toggle switches to past matches (`scheduled_at < now`, descending order).

**Friend system**: Friendships are directional (requester → addressee) then mutual on accept. `useFriendStore().getRelation(userId)` returns `{ kind: FriendRelationKind, friendshipId }` — use this to drive friend action buttons on any profile. Sending a request / accepting also inserts a `notifications` row for the other user.

**Match sharing with friends**: Call `useFriendStore().sendMatchInvites(senderUsername, friendIds[], match)` — bulk-inserts `match_invite` notifications. The notifications page navigates to the match on click.

**In-app notifications**: INSERT into `notifications` table with `type`, `title`, `body`, `data` (jsonb). The Navbar owns the realtime subscription and badge count. Pages call `fetchNotifications` on mount only — they do not subscribe to realtime themselves.

**Avatar upload**: `supabase.storage.from('avatars').upload(`${userId}/avatar.${ext}`, file, { upsert: true })` → get public URL via `getPublicUrl` → update `profiles.avatar_url`. To remove: list files in `${userId}/` folder, `storage.remove([...paths])`, then set `avatar_url = null` in profiles.

**Levels section**: The `player_ratings` table drives which sports appear in the Levels card on the profile page. The level value itself is currently a `—` placeholder — update when the level/rank system is implemented.

**Payment**: Schema has `price_per_player` and `currency` on `matches` — present but payment UI is not implemented. Do not add Stripe integration unless explicitly asked.

## Git & GitHub Workflow

Repo: `DePinto-95/matchd`.

**Commit locally and push to GitHub after every meaningful unit of work — do not wait to be asked.** The goal is that GitHub always holds an up-to-date saved version of the project, so no work is ever lost and we can always revert to a known-good state. As you complete each coherent change, commit it with a clean message and push it the same session.

Workflow for each unit of work:
1. Stage only the files for that change — `git add web/<changed files>` (avoid `git add .`).
2. Commit locally with a clean, descriptive message (see format below).
3. Push to GitHub right away: `git push origin main`.

Keep commits focused: one logical change per commit so history stays easy to read and revert. Prefer several small, clean commits over one large mixed one.

Clean commit message format:
- Subject line: `<prefix>: <imperative summary>` (≤ ~72 chars), using a prefix below.
- Optional body: a blank line, then *why* the change was made and any notable details.
- Prefixes: `feat:`, `fix:`, `refactor:`, `chore:`, `style:`, `docs:`, `test:`.

Rules:
- Never commit `.env.local` or any file containing secrets.
- Never use `--no-verify` or skip hooks unless explicitly asked.
- If a push fails, surface it — don't leave work committed only locally without saying so.

```bash
git add web/<changed files>
git commit -m "feat: description of what was implemented"
git push origin main
```

## Environment Variables

File: `web/.env.local` (git-ignored — never commit):
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
