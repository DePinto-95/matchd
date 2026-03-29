export type SportType =
  | 'football'
  | 'mini_football_5v5'
  | 'mini_football_8v8'
  | 'padel'
  | 'tennis'
  | 'basketball'
  | 'volleyball'
  | 'other';

export type AccountType = 'player' | 'venue';
export type MatchStatus = 'open' | 'full' | 'in_progress' | 'completed' | 'cancelled';
export type TeamSide = 'home' | 'away';

export interface Profile {
  id: string;
  account_type: AccountType;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  created_at: string;
}

export interface PlayerRating {
  id: string;
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
  venue_id: string | null;
  sport: SportType;
  title: string;
  description: string | null;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  scheduled_at: string;
  duration_minutes: number;
  max_players: number;
  current_players: number;
  team_size: number;
  min_rating: number;
  max_rating: number;
  is_private: boolean;
  invite_code: string | null;
  status: MatchStatus;
  price_per_player: number;
  currency: string;
  created_at: string;
  // Joined
  profiles?: Profile;
  venues?: Venue;
  match_participants?: MatchParticipant[];
  match_teams?: MatchTeam[];
}

export interface MatchTeam {
  id: string;
  match_id: string;
  side: TeamSide;
  name: string | null;
}

export interface MatchParticipant {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string | null;
  joined_at: string;
  status: string;
  profiles?: Profile;
}

export interface Venue {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  cover_url: string | null;
  sports: SportType[];
  amenities: string[] | null;
  verified: boolean;
  created_at: string;
}

export interface Squad {
  id: string;
  name: string;
  creator_id: string;
  created_at: string;
  squad_members?: SquadMember[];
}

export interface SquadMember {
  squad_id: string;
  player_id: string;
  joined_at: string;
  profiles?: Profile;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  profiles?: Profile;
}

export interface MatchRating {
  id: string;
  match_id: string;
  rater_id: string;
  rated_player_id: string;
  sport: SportType;
  score: number;
  comment: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  venue_id: string;
  match_id: string | null;
  booked_by: string | null;
  field_name: string | null;
  starts_at: string;
  ends_at: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string | null;
  created_at: string;
  matches?: Match;
  profiles?: Profile;
}
