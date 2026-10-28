import { SportType } from '../enums';

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
