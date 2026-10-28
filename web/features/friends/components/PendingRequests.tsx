import { UserCheck } from 'lucide-react';
import { Friendship } from '@matchd/shared/types';
import { Button } from '@/components/ui/Button';
import { FriendActions } from '../hooks/useFriendActions';
import { EmptyState } from './EmptyState';
import { PersonRow } from './PersonRow';

interface PendingRequestsProps {
  pendingIn: Friendship[];
  pendingOut: Friendship[];
  actions: FriendActions;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

export function PendingRequests({ pendingIn, pendingOut, actions }: PendingRequestsProps) {
  if (pendingIn.length === 0 && pendingOut.length === 0) {
    return (
      <EmptyState
        icon={UserCheck}
        title="No pending requests"
        message="When someone sends you a request, it'll appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {pendingIn.length > 0 && (
        <Section title="Incoming">
          {pendingIn.map((f) =>
            f.profiles ? (
              <PersonRow key={f.id} profile={f.profiles}>
                <Button size="sm" loading={actions.actingOn === f.id} onClick={() => actions.accept(f.id)}>
                  Accept
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={actions.actingOn === f.id}
                  onClick={() => actions.decline(f.id)}
                >
                  Decline
                </Button>
              </PersonRow>
            ) : null
          )}
        </Section>
      )}

      {pendingOut.length > 0 && (
        <Section title="Sent">
          {pendingOut.map((f) =>
            f.profiles ? (
              <PersonRow key={f.id} profile={f.profiles}>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={actions.actingOn === f.id}
                  onClick={() => actions.cancel(f.id)}
                >
                  Cancel
                </Button>
              </PersonRow>
            ) : null
          )}
        </Section>
      )}
    </div>
  );
}
