import { SportType } from '../enums';

export interface PlayerRating {
  id: string;
  player_id: string;
  sport: SportType;
  rating: number;
  elo_rating: number;
  peer_rating: number;
  elo_applied: boolean;
  total_matches: number;
  wins: number;
  rating_count: number;
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
