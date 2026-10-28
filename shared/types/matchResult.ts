import { MatchResultStatus, MatchWinnerSide, TeamSide } from '../enums';

export interface MatchResult {
  id: string;
  match_id: string;
  submitted_by: string;
  submitter_team: TeamSide;
  home_score: number;
  away_score: number;
  winner_side: MatchWinnerSide;
  status: MatchResultStatus;
  counter_submitted_by: string | null;
  counter_home_score: number | null;
  counter_away_score: number | null;
  counter_winner_side: MatchWinnerSide | null;
  elo_applied: boolean;
  created_at: string;
}
