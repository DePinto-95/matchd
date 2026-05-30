# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**SportsMeet** — a platform where players create and join sports matches with strangers or friends. Supports football, mini football (5v5/8v8), padel, tennis, basketball, volleyball. Two account types: `player` and `venue` (sports centers).

## Folder Structure

```
MatchD/
├── web/        ← ACTIVE PROJECT (Next.js web app)
└── matchd/     ← Reference only (original React Native/Expo app, not in active development)
```

All active development happens in `web/`. The `matchd/` folder is kept as a reference for when the mobile app is built later.

## Commands (run from `web/`)

```bash
# Start dev server
npm run dev

# Build for production
npm run build
```

## Architecture (`web/`)

### Routing — Next.js 16 App Router (file-based)
- `app/(app)/` — authenticated pages (wrapped with Navbar)
- `app/(app)/page.tsx` — home feed (upcoming matches)
- `app/(app)/create/page.tsx` — multi-step match creation wizard
- `app/(app)/matches/[id]/page.tsx` — match detail, team slots, join/leave flow
- `app/(app)/matches/[id]/rate/page.tsx` — post-match player rating
- `app/(app)/profile/page.tsx` — player profile
- `app/(app)/players/[id]/page.tsx` — public player profile
- `app/(app)/venues/[id]/page.tsx` — public venue page
- `app/(app)/notifications/page.tsx` — notification list
- `app/auth/login/page.tsx` — login
- `app/auth/register/page.tsx` — register
- `app/auth/forgot-password/page.tsx` — request password reset email
- `app/auth/reset-password/page.tsx` — set new password (after email link)
- `app/auth/callback/route.ts` — Supabase auth callback (exchanges PKCE code for session)

**Next.js 16 note**: `middleware.ts` is renamed to `proxy.ts`, exported function is `proxy()` not `middleware()`.

### Backend — Supabase
- Browser client: `lib/supabase/client.ts` (uses `createBrowserClient` from `@supabase/ssr`)
- Server client: `lib/supabase/server.ts` (uses `createServerClient` + Next.js cookies)
- All DB operations go through the Supabase JS client — no separate API layer.

Key tables:
- `profiles` — extends `auth.users`; `account_type: 'player' | 'venue'`
- `matches` — status lifecycle: `open → full → in_progress → completed/cancelled`
- `match_participants` — DB trigger auto-increments `matches.current_players` and flips status to `full` when at capacity. Key columns: `extra_spots` (reserved spots on own team), `extra_spots_opponent` (reserved spots on opponent team)
- `match_teams` — `home`/`away` rows per match; participants reference a team
- `player_ratings` — one row per `(player_id, sport)`; DB trigger recalculates weighted rolling average on each `match_ratings` insert (default 5.0/10)
- `venues` — owned by `venue` accounts; matches link via `venue_id`

Custom DB functions:
- `adjust_match_player_count(p_match_id, p_delta)` — RPC to manually adjust `current_players` beyond what the INSERT/DELETE trigger handles (used for squad spot reservations)

### State — Zustand
Stores in `stores/`: `authStore.ts`, `matchStore.ts`, `notificationStore.ts`.

### Realtime
Supabase Realtime subscriptions in `hooks/useRealtime.ts`. Subscribe to `match_participants` changes to update team slots live.

### Forms
React Hook Form + Zod for all forms.

### Styling — Tailwind CSS v4
Configured via `@import "tailwindcss"` and `@theme inline` in `app/globals.css` (no `tailwind.config.ts` needed).

Design tokens:
- Background: `#0a0a0f`, Surface: `#13131a`, Surface-alt: `#1c1c27`
- Brand: `#6c63ff`, Border: `#2a2a3d`, Text: `#f0f0ff`, Text-muted: `#8888aa`
- Success: `#22c55e`, Warning: `#f59e0b`, Error: `#ef4444`
- Fonts: Space Grotesk (headings), Inter (body)

### Sport Config
All sport metadata lives in `constants/sports.ts`. Reference `SPORTS[sport]` everywhere — never hardcode sport-specific values inline.

## Key Patterns

**Joining a match**: Insert into `match_participants` with `player_id = auth.uid()` and `extra_spots = squadSpots - 1`. The DB trigger handles `current_players` increment. Call `adjust_match_player_count` RPC for extra spots beyond the base insert.

**Squad spot reservations**: A participant has one row in `match_participants`. `extra_spots` reserves additional slots on their own team; `extra_spots_opponent` reserves slots on the opposing team. Both are tracked separately and adjusted via the RPC.

**Leaving a match**: DELETE the participant row (trigger decrements `current_players` by 1), then call RPC with `-(extra_spots + extra_spots_opponent)` to release all reserved spots.

**Match date validation**: Matches must be scheduled in the future and no more than 1 year ahead. Date input is `DD/MM/YYYY`, time is `HH:MM` (24h). Both auto-format as the user types.

**Rating system**: Ratings are never self-reported. After a match completes, players rate opponents via `match_ratings`. The `update_player_rating` DB trigger recalculates the rolling average.

**Private matches**: Set `is_private = true` and share the `invite_code`. Join is only possible with the code.

**Password reset flow**: `resetPasswordForEmail` → email link → `/auth/callback` (exchanges PKCE code, sets session cookies on redirect response) → `/auth/reset-password` (calls `updateUser`, then `signOut`, redirects to login).

**Home feed filtering**: Default shows upcoming matches (`status IN ('open','full')` and `scheduled_at >= now`). A History toggle switches to past matches (`scheduled_at < now`, descending order).

**Payment**: Schema has `price_per_player` and `currency` on `matches` — present but payment UI is not implemented. Do not add Stripe integration unless explicitly asked.

## Git & GitHub Workflow

Repo: `DePinto-95/matchd`. **Commit and push after every meaningful unit of work.**

- Use prefixes: `feat:`, `fix:`, `refactor:`, `chore:`, `style:`
- Never commit `.env.local` or any file containing secrets

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
