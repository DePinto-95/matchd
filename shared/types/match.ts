import { MatchStatus, ParticipantStatus, SportType, TeamSide } from '../enums';
import { Profile } from './profile';
import { Venue } from './venue';

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
  rating_notifications_sent: boolean;
  confirmation_sent_at: string | null;
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
  status: ParticipantStatus;
  extra_spots: number;
  extra_spots_opponent?: number;
  rating_submitted: boolean;
  profiles?: Profile;
}
