import { AccountType } from '../enums';

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
