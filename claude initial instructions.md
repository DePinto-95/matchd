# SportsMeet — Claude Code Project Script

## Project Overview

Build **SportsMeet**, a cross-platform mobile app (React Native + Expo) where people can create and join sports matches with strangers or friends. Includes player rating systems, venue/sports-center accounts, and match management across multiple sports.

---

## Tech Stack

- **Frontend**: React Native (Expo SDK 51+)
- **Backend**: Supabase (Postgres, Auth, Realtime, Storage)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Zustand
- **Styling**: NativeWind (Tailwind for React Native)
- **Notifications**: Expo Notifications
- **Maps**: react-native-maps + expo-location
- **Forms**: React Hook Form + Zod

---

## 1. Project Initialization

```bash
npx create-expo-app@latest sportsmeet --template tabs
cd sportsmeet
npx expo install nativewind zustand @supabase/supabase-js react-native-maps expo-location expo-notifications react-hook-form zod @hookform/resolvers date-fns react-native-gesture-handler react-native-reanimated expo-image-picker @react-native-async-storage/async-storage
npx expo install tailwindcss --save-dev
```

Initialize NativeWind:
```bash
npx tailwindcss init
```

---

## 2. Supabase Setup

Create a project at https://supabase.com and run the following SQL in the Supabase SQL editor:

```sql
-- ENUMS
CREATE TYPE sport_type AS ENUM ('football', 'mini_football_5v5', 'mini_football_8v8', 'padel', 'tennis', 'basketball', 'volleyball', 'other');
CREATE TYPE match_status AS ENUM ('open', 'full', 'in_progress', 'completed', 'cancelled');
CREATE TYPE account_type AS ENUM ('player', 'venue');
CREATE TYPE team_side AS ENUM ('home', 'away');

-- PROFILES (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type account_type NOT NULL DEFAULT 'player',
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PLAYER RATINGS (one row per sport per player)
CREATE TABLE player_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sport sport_type NOT NULL,
  rating NUMERIC(4,2) DEFAULT 5.0 CHECK (rating >= 1 AND rating <= 10),
  total_matches INT DEFAULT 0,
  wins INT DEFAULT 0,
  rating_count INT DEFAULT 0,
  UNIQUE(player_id, sport)
);

-- VENUES (for sports center accounts)
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  cover_url TEXT,
  sports sport_type[],
  amenities TEXT[],
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MATCHES
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  sport sport_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location_name TEXT NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 90,
  max_players INT NOT NULL,
  current_players INT DEFAULT 0,
  team_size INT NOT NULL, -- players per team
  min_rating NUMERIC(4,2) DEFAULT 1.0,
  max_rating NUMERIC(4,2) DEFAULT 10.0,
  is_private BOOLEAN DEFAULT FALSE,
  invite_code TEXT UNIQUE,
  status match_status DEFAULT 'open',
  price_per_player NUMERIC(8,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TEAMS within a match
CREATE TABLE match_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  side team_side NOT NULL,
  name TEXT,
  UNIQUE(match_id, side)
);

-- MATCH PARTICIPANTS
CREATE TABLE match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES match_teams(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'confirmed', -- confirmed, waitlist, cancelled
  UNIQUE(match_id, player_id)
);

-- FRIEND GROUPS (squads)
CREATE TABLE squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE squad_members (
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (squad_id, player_id)
);

-- FRIENDS
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, accepted, blocked
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- POST-MATCH RATINGS
CREATE TABLE match_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  rater_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rated_player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sport sport_type NOT NULL,
  score INT CHECK (score >= 1 AND score <= 10),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, rater_id, rated_player_id)
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- match_joined, match_full, rating_received, friend_request, etc.
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VENUE BOOKINGS (for venue accounts)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  booked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  field_name TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (expand as needed)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Player ratings viewable by everyone" ON player_ratings FOR SELECT USING (true);
CREATE POLICY "Matches viewable by everyone" ON matches FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create matches" ON matches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Creator can update their match" ON matches FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Participants viewable by everyone" ON match_participants FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join matches" ON match_participants FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "Users can leave matches" ON match_participants FOR DELETE USING (auth.uid() = player_id);

CREATE POLICY "Ratings viewable by everyone" ON match_ratings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can rate" ON match_ratings FOR INSERT WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Venues viewable by everyone" ON venues FOR SELECT USING (true);
CREATE POLICY "Venue owners can manage their venue" ON venues FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Users see their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see their own bookings" ON bookings FOR SELECT USING (auth.uid() = booked_by OR venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid()));

-- FUNCTION: Auto-update player rating after a match rating is submitted
CREATE OR REPLACE FUNCTION update_player_rating()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO player_ratings (player_id, sport, rating, rating_count)
  VALUES (NEW.rated_player_id, NEW.sport, NEW.score, 1)
  ON CONFLICT (player_id, sport)
  DO UPDATE SET
    rating = (player_ratings.rating * player_ratings.rating_count + NEW.score) / (player_ratings.rating_count + 1),
    rating_count = player_ratings.rating_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_rating_inserted
AFTER INSERT ON match_ratings
FOR EACH ROW EXECUTE FUNCTION update_player_rating();

-- FUNCTION: Auto-update current_players count on match
CREATE OR REPLACE FUNCTION update_match_player_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE matches SET current_players = current_players + 1 WHERE id = NEW.match_id;
    IF (SELECT current_players FROM matches WHERE id = NEW.match_id) >= (SELECT max_players FROM matches WHERE id = NEW.match_id) THEN
      UPDATE matches SET status = 'full' WHERE id = NEW.match_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE matches SET current_players = GREATEST(current_players - 1, 0), status = 'open' WHERE id = OLD.match_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_participant_change
AFTER INSERT OR DELETE ON match_participants
FOR EACH ROW EXECUTE FUNCTION update_match_player_count();
```

---

## 3. Environment Variables

Create `.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 4. File Structure to Create

```
sportsmeet/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── onboarding.tsx          # Choose: Player or Venue account
│   ├── (tabs)/
│   │   ├── index.tsx               # Home feed - nearby matches
│   │   ├── discover.tsx            # Browse matches by sport
│   │   ├── create.tsx              # Create a match
│   │   ├── profile.tsx             # My profile
│   │   └── notifications.tsx
│   ├── match/
│   │   ├── [id].tsx                # Match detail page
│   │   └── post-match-rating.tsx   # Rating screen after match
│   ├── sport/
│   │   └── [sport].tsx             # Sport-specific browse page
│   ├── venue/
│   │   ├── [id].tsx                # Venue profile
│   │   └── dashboard.tsx           # Venue owner dashboard
│   ├── player/
│   │   └── [id].tsx                # Player profile
│   ├── squad/
│   │   ├── index.tsx               # My squads
│   │   └── [id].tsx                # Squad detail
│   └── _layout.tsx
├── components/
│   ├── MatchCard.tsx
│   ├── SportSelector.tsx
│   ├── RatingBadge.tsx
│   ├── PlayerCard.tsx
│   ├── TeamSlots.tsx               # Visual team slots (filled/empty)
│   ├── SportIcon.tsx
│   ├── FilterBar.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Avatar.tsx
│       ├── Badge.tsx
│       └── Modal.tsx
├── lib/
│   ├── supabase.ts
│   ├── auth.ts
│   └── helpers.ts
├── stores/
│   ├── authStore.ts
│   ├── matchStore.ts
│   └── notificationStore.ts
├── hooks/
│   ├── useMatches.ts
│   ├── useProfile.ts
│   ├── useRatings.ts
│   └── useRealtime.ts
├── constants/
│   ├── sports.ts                   # Sport configs (name, icon, team sizes, etc.)
│   └── theme.ts
└── types/
    └── index.ts
```

---

## 5. Core Files to Implement

### `lib/supabase.ts`
```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### `constants/sports.ts`
```typescript
export const SPORTS = {
  football: {
    id: 'football',
    label: 'Football',
    emoji: '⚽',
    color: '#22c55e',
    teamSizes: [11],
    defaultDuration: 90,
    icon: 'football',
  },
  mini_football_5v5: {
    id: 'mini_football_5v5',
    label: 'Mini Football 5v5',
    emoji: '⚽',
    color: '#3b82f6',
    teamSizes: [5],
    defaultDuration: 60,
    icon: 'football',
  },
  mini_football_8v8: {
    id: 'mini_football_8v8',
    label: 'Mini Football 8v8',
    emoji: '⚽',
    color: '#8b5cf6',
    teamSizes: [8],
    defaultDuration: 70,
    icon: 'football',
  },
  padel: {
    id: 'padel',
    label: 'Padel',
    emoji: '🎾',
    color: '#f59e0b',
    teamSizes: [2],
    defaultDuration: 90,
    icon: 'tennis',
  },
  tennis: {
    id: 'tennis',
    label: 'Tennis',
    emoji: '🎾',
    color: '#ef4444',
    teamSizes: [1, 2],
    defaultDuration: 60,
    icon: 'tennis',
  },
  basketball: {
    id: 'basketball',
    label: 'Basketball',
    emoji: '🏀',
    color: '#f97316',
    teamSizes: [5],
    defaultDuration: 60,
    icon: 'basketball',
  },
  volleyball: {
    id: 'volleyball',
    label: 'Volleyball',
    emoji: '🏐',
    color: '#06b6d4',
    teamSizes: [6],
    defaultDuration: 60,
    icon: 'volleyball',
  },
};
```

### `types/index.ts`
```typescript
export type SportType = 'football' | 'mini_football_5v5' | 'mini_football_8v8' | 'padel' | 'tennis' | 'basketball' | 'volleyball' | 'other';
export type AccountType = 'player' | 'venue';
export type MatchStatus = 'open' | 'full' | 'in_progress' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  account_type: AccountType;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  created_at: string;
}

export interface PlayerRating {
  player_id: string;
  sport: SportType;
  rating: number;
  total_matches: number;
  wins: number;
  rating_count: number;
}

export interface Match {
  id: string;
  creator_id: string;
  venue_id?: string;
  sport: SportType;
  title: string;
  description?: string;
  location_name: string;
  latitude?: number;
  longitude?: number;
  scheduled_at: string;
  duration_minutes: number;
  max_players: number;
  current_players: number;
  team_size: number;
  min_rating: number;
  max_rating: number;
  is_private: boolean;
  invite_code?: string;
  status: MatchStatus;
  price_per_player: number;
  currency: string;
  created_at: string;
  // Joined fields
  profiles?: Profile;
  venues?: Venue;
  match_participants?: MatchParticipant[];
}

export interface MatchParticipant {
  id: string;
  match_id: string;
  player_id: string;
  team_id?: string;
  joined_at: string;
  status: string;
  profiles?: Profile;
}

export interface Venue {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  logo_url?: string;
  sports: SportType[];
  verified: boolean;
}

export interface MatchRating {
  id: string;
  match_id: string;
  rater_id: string;
  rated_player_id: string;
  sport: SportType;
  score: number;
  comment?: string;
}
```

---

## 6. Key Screen Logic to Implement

### Home Feed (`app/(tabs)/index.tsx`)
- Fetch nearby open matches using Supabase geo queries (order by distance if lat/lng available)
- Show sport filter pills at top (All, Football, Padel, Tennis, etc.)
- Each MatchCard shows: sport icon, title, location, time, player slots (e.g. 3/10), rating range, price
- Pull to refresh
- Real-time updates via Supabase Realtime subscriptions

### Create Match (`app/(tabs)/create.tsx`)
- Step 1: Select sport → auto-fills team size options
- Step 2: Set location (search or pick on map)
- Step 3: Set date/time, duration
- Step 4: Set player limits, rating range, privacy
- Step 5: Optional: link to venue, add description, price
- On submit: Insert into `matches`, auto-create two `match_teams` rows, add creator as first participant

### Match Detail (`app/match/[id].tsx`)
- Show full match info
- Visual team slots: two columns (Home/Away), each slot shows player avatar or empty circle
- "Join Match" button → picks team with fewer players, inserts into `match_participants`
- "Join with Squad" → shows squad picker, joins multiple players
- Share button → generates deep link with invite_code for private matches
- Chat section (use Supabase Realtime for simple match chat)
- If user is creator: can manage teams, kick players, cancel match

### Post-Match Rating (`app/match/post-match-rating.tsx`)
- Triggered after match `scheduled_at + duration` passes
- Show list of opponents (random order, show one by default)
- Rate 1-10 with slider + optional comment
- User must rate at least 1 player, can rate more
- Logic: use `match_ratings` table, prevent double-rating
- After submit: update `player_ratings` via database trigger

### Player Profile (`app/player/[id].tsx`)
- Avatar, username, bio
- Sport ratings grid (one card per sport they've played, showing rating/10)
- Match history (recent matches)
- Friends button, Squad invite button

### Venue Dashboard (`app/venue/dashboard.tsx`)
- Calendar view of bookings
- List of upcoming matches at their venue
- Stats: total bookings this week/month
- Ability to confirm/reject pending bookings
- Edit venue details, sports offered, photos

### Rating System Logic
- Default rating: 5.0/10 for all sports
- Rating only changes after rated matches (not self-reported)
- Weighted rolling average: `new_avg = (old_avg * count + new_score) / (count + 1)`
- Match filter: players outside `min_rating`-`max_rating` range cannot join
- Display: color-coded (red 1-4, yellow 4-6, green 6-8, gold 8-10)

---

## 7. Realtime Features

```typescript
// In useRealtime.ts hook
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useMatchRealtime(matchId: string, onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel(`match:${matchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_participants',
        filter: `match_id=eq.${matchId}`,
      }, onUpdate)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);
}
```

---

## 8. Push Notifications

Set up Expo Notifications for:
- Someone joins your match
- Your match is now full
- 1 hour reminder before match
- Post-match rating prompt
- Friend request received
- Match cancelled

Use Supabase Edge Functions + Expo Push API to send server-side notifications.

---

## 9. Design System

Use a dark-first design with sport-specific accent colors.

```typescript
// constants/theme.ts
export const theme = {
  colors: {
    background: '#0a0a0f',
    surface: '#13131a',
    surfaceAlt: '#1c1c27',
    border: '#2a2a3d',
    text: '#f0f0ff',
    textMuted: '#8888aa',
    primary: '#6c63ff',    // Brand purple
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    rating: {
      low: '#ef4444',
      mid: '#f59e0b',
      good: '#22c55e',
      elite: '#f59e0b',
    }
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 },
  font: {
    heading: 'SpaceGrotesk-Bold',
    body: 'Inter-Regular',
    mono: 'JetBrainsMono-Regular',
  }
};
```

---

## 10. Run the App

```bash
npx expo start
# Press 'i' for iOS simulator, 'a' for Android emulator
# Or scan QR code with Expo Go app
```

---

## Future Payment Integration

Payment is architected but not activated. To enable later:
1. Add Stripe SDK: `npx expo install @stripe/stripe-react-native`
2. Create Supabase Edge Function for payment intents
3. Add `price_per_player` field to match creation (already in schema)
4. Collect payment on match join
5. Hold payment in escrow, release to venue/creator after match
6. Handle refunds on cancellation

The schema already has `price_per_player` and `currency` fields on every match.

---

## Claude Code Instructions

When you open this project in Claude Code, say:

> "Please read CLAUDE.md and implement the full SportsMeet app following the architecture, database schema, file structure, and screen logic described. Start with: (1) Supabase client setup, (2) auth flow with player/venue account types, (3) the home feed with match cards, (4) match detail with team slots, (5) create match flow, (6) player profiles with sport ratings, (7) venue dashboard, (8) post-match rating system. Use the design system defined in constants/theme.ts with a dark theme. Make all screens feel polished and production-ready."
