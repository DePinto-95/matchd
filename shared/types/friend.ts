import { FriendRelationKind, FriendshipStatus } from '../enums';
import { Profile } from './profile';

export type FriendRelation =
  | { kind: FriendRelationKind.None }
  | { kind: FriendRelationKind.PendingSent;     friendshipId: string }
  | { kind: FriendRelationKind.PendingReceived; friendshipId: string }
  | { kind: FriendRelationKind.Friends;         friendshipId: string };

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  profiles?: Profile;
}
