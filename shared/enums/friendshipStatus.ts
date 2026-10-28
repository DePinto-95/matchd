/**
 * State of a directional friend request (requester -> addressee).
 * DB: `friendships.status` (TEXT + CHECK).
 */
export enum FriendshipStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Blocked = 'blocked',
}
