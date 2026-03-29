# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**SportsMeet** — a cross-platform mobile app (React Native + Expo) where players create and join sports matches with strangers or friends. Supports football, mini football (5v5/8v8), padel, tennis, basketball, volleyball. Two account types: `player` and `venue` (sports centers).

## Commands

```bash
# Start dev server
npx expo start

# Target specific platform
npx expo start --ios
npx expo start --android

# Install a new package (use expo's wrapper to ensure compatibility)
npx expo install <package-name>
```

## Architecture

### Routing — Expo Router (file-based)
All routes live in `app/`. Key groups:
- `app/(auth)/` — login, register, onboarding (player vs venue selection)
- `app/(tabs)/` — main tab navigator: home feed, discover, create match, profile, notifications
- `app/match/[id].tsx` — match detail + team slots
- `app/match/post-match-rating.tsx` — rate opponents after match ends
- `app/player/[id].tsx` — player profile with per-sport ratings
- `app/venue/[id].tsx` — public venue page
- `app/venue/dashboard.tsx` — venue owner booking management
- `app/squad/[id].tsx` — squad detail

### Backend — Supabase
Single client instance in `lib/supabase.ts` using AsyncStorage for session persistence. All DB operations go through the Supabase JS client — no separate API layer.

Key tables and their relationships:
- `profiles` — extends `auth.users`; `account_type: 'player' | 'venue'`
- `matches` — status lifecycle: `open → full → in_progress → completed/cancelled`
- `match_participants` — DB trigger auto-increments `matches.current_players` and flips status to `full` when at capacity
- `match_teams` — `home`/`away` rows per match; participants reference a team
- `player_ratings` — one row per `(player_id, sport)`; DB trigger recalculates weighted rolling average on each `match_ratings` insert (default 5.0/10)
- `venues` — owned by `venue` accounts; matches link via `venue_id`

### State — Zustand
Stores in `stores/`: `authStore.ts`, `matchStore.ts`, `notificationStore.ts`. No Redux, no Context for global state.

### Realtime
Supabase Realtime subscriptions are managed in `hooks/useRealtime.ts`. Always call `supabase.removeChannel(channel)` in the `useEffect` cleanup. Subscribe to `match_participants` changes to update team slots live.

### Forms
React Hook Form + Zod for all forms. Resolvers in `@hookform/resolvers/zod`.

### Styling
NativeWind (Tailwind for React Native) + custom theme in `constants/theme.ts`. Dark-first design:
- Background: `#0a0a0f`, Surface: `#13131a`, Brand purple: `#6c63ff`
- Rating colors: red `#ef4444` (1–4), yellow `#f59e0b` (4–6), green `#22c55e` (6–8), gold `#f59e0b` (8–10)
- Fonts: SpaceGrotesk-Bold (headings), Inter-Regular (body)

### Sport Config
All sport metadata (team sizes, colors, icons, default duration) lives in `constants/sports.ts`. Reference `SPORTS[sport]` everywhere — never hardcode sport-specific values inline.

## Key Patterns

**Joining a match**: Insert into `match_participants` with `player_id = auth.uid()`. The DB trigger handles `current_players` count and status transitions automatically.

**Rating system**: Ratings are never self-reported. After a match completes, players rate opponents (and optionally teammates) via `match_ratings`. The `update_player_rating` DB trigger recalculates the rolling average: `new_avg = (old_avg * count + new_score) / (count + 1)`. Match creation can set `min_rating`/`max_rating` to filter eligible joiners.

**Private matches**: Set `is_private = true` and share the `invite_code` deep link. Join is only possible with the code.

**Venue accounts**: `account_type = 'venue'` unlocks `app/venue/dashboard.tsx`. Venues manage bookings from the `bookings` table (status: `pending → confirmed/cancelled`).

**Push notifications**: Triggered server-side via Supabase Edge Functions + Expo Push API. Client registers device token on login via `expo-notifications`.

**Payment**: Schema has `price_per_player` and `currency` on `matches` — already present but payment UI is not implemented. Do not add Stripe integration unless explicitly asked.

## Git & GitHub Workflow

This project uses Git with GitHub (repo: `DePinto-95/matchd`). **After every meaningful unit of work, commit and push.**

Rules:
- Commit after each logical feature, screen, or fix — not after every file save, not after huge multi-feature batches
- Push to `main` after every commit so the remote is always up to date
- Write clean, specific commit messages: `feat: add match detail screen with team slots` not `update files`
- Use prefixes: `feat:`, `fix:`, `refactor:`, `chore:`, `style:`
- Never commit `.env.local` or any file containing secrets

```bash
git add matchd/<changed files>
git commit -m "feat: description of what was implemented"
git push origin main
```

## Environment Variables

Template at `sportsmeet/.env.local` (git-ignored — never commit):
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
