import { Profile } from './profile';

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
