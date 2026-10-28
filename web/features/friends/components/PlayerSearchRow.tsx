import { Clock, UserCheck, UserPlus } from 'lucide-react';
import { Profile } from '@matchd/shared/types';
import { FriendRelationKind } from '@matchd/shared/enums';
import { FriendRelation } from '@matchd/shared/types';
import { Button } from '@/components/ui/Button';
import { FriendActions } from '../hooks/useFriendActions';
import { PersonRow } from './PersonRow';

interface PlayerSearchRowProps {
  profile: Profile;
  relation: FriendRelation;
  actions: FriendActions;
}

/**
 * A search result with the right action for the current relationship:
 * Add, Pending (cancel), Accept, or a disabled Friends badge.
 */
export function PlayerSearchRow({ profile, relation, actions }: PlayerSearchRowProps) {
  const { actingOn } = actions;

  return (
    <PersonRow profile={profile}>
      {relation.kind === FriendRelationKind.None && (
        <Button size="sm" loading={actingOn === profile.id} onClick={() => actions.send(profile.id)}>
          <UserPlus className="w-4 h-4" />
          Add
        </Button>
      )}
      {relation.kind === FriendRelationKind.PendingSent && (
        <Button
          variant="secondary"
          size="sm"
          loading={actingOn === relation.friendshipId}
          onClick={() => actions.cancel(relation.friendshipId)}
        >
          <Clock className="w-4 h-4" />
          Pending
        </Button>
      )}
      {relation.kind === FriendRelationKind.PendingReceived && (
        <Button
          size="sm"
          loading={actingOn === relation.friendshipId}
          onClick={() => actions.accept(relation.friendshipId)}
        >
          <UserCheck className="w-4 h-4" />
          Accept
        </Button>
      )}
      {relation.kind === FriendRelationKind.Friends && (
        <Button variant="ghost" size="sm" disabled>
          <UserCheck className="w-4 h-4" />
          Friends
        </Button>
      )}
    </PersonRow>
  );
}
