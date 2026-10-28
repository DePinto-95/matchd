import { Clock, Flag, UserCheck, UserPlus, UserX } from 'lucide-react';
import { FriendRelation, Profile } from '@matchd/shared/types';
import { FriendRelationKind } from '@matchd/shared/enums';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface PlayerProfileCardProps {
  profile: Profile;
  /** Null when viewing your own profile, where no friend actions apply. */
  relation: FriendRelation | null;
  acting: boolean;
  onFriendAction: () => void;
  onReport: () => void;
}

export function PlayerProfileCard({
  profile,
  relation,
  acting,
  onFriendAction,
  onReport,
}: PlayerProfileCardProps) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <div className="flex items-center gap-4">
        <Avatar src={profile.avatar_url} name={profile.full_name ?? profile.username} size="xl" />
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-bold text-xl text-text">
            {profile.full_name ?? profile.username}
          </h1>
          <p className="text-text-muted text-sm">@{profile.username}</p>
          {profile.location && (
            <p className="text-text-muted text-sm mt-1">📍 {profile.location}</p>
          )}
          <Badge variant="brand" className="mt-2 capitalize">{profile.account_type}</Badge>
        </div>
      </div>

      {profile.bio && <p className="mt-4 text-text-muted text-sm leading-relaxed">{profile.bio}</p>}

      {relation && (
        <div className="flex items-center gap-3 mt-5 pt-5 border-t border-border">
          <Button
            variant={relation.kind === FriendRelationKind.Friends ? 'secondary' : 'primary'}
            size="sm"
            loading={acting}
            onClick={onFriendAction}
          >
            {relation.kind === FriendRelationKind.None && <><UserPlus className="w-4 h-4" /> Add Friend</>}
            {relation.kind === FriendRelationKind.PendingSent && <><Clock className="w-4 h-4" /> Pending</>}
            {relation.kind === FriendRelationKind.PendingReceived && <><UserCheck className="w-4 h-4" /> Accept</>}
            {relation.kind === FriendRelationKind.Friends && <><UserX className="w-4 h-4" /> Remove Friend</>}
          </Button>
          <Button variant="ghost" size="sm" onClick={onReport}>
            <Flag className="w-4 h-4" />
            Report
          </Button>
        </div>
      )}
    </div>
  );
}
