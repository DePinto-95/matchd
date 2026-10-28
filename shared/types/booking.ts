import { BookingStatus } from '../enums';
import { Match } from './match';
import { Profile } from './profile';

export interface Booking {
  id: string;
  venue_id: string;
  match_id: string | null;
  booked_by: string | null;
  field_name: string | null;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  matches?: Match;
  profiles?: Profile;
}
