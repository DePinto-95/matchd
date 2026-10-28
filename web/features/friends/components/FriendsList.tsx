import { UserX, Users } from 'lucide-react';
import { Friendship } from '@matchd/shared/types';
import { Button } from '@/components/ui/Button';
import { FriendActions } from '../hooks/useFriendActions';
import { EmptyState } from './EmptyState';
import { PersonRow } from './PersonRow';
import { SkeletonRows } from './SkeletonRows';

interface FriendsListProps {
  friends: Friendship[];
  loading: boolean;
  actions: FriendActions;
}

export function FriendsList({ friends, loading, actions }: FriendsListProps) {
  if (loading) return <SkeletonRows height="h-16" />;

  if (friends.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No friends yet"
        message="Use the Find People tab to search for players."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {friends.map((f) =>
        f.profiles ? (
          <PersonRow key={f.id} profile={f.profiles}>
            <Button
              variant="ghost"
              size="sm"
              loading={actions.actingOn === f.id}
              onClick={() => actions.remove(f.id)}
            >
              <UserX className="w-4 h-4" />
              Remove
            </Button>
          </PersonRow>
        ) : null
      )}
    </div>
  );
}
