import Link from 'next/link';
import { Profile } from '@matchd/shared/types';
import { Avatar } from '@/components/ui/Avatar';

interface PersonRowProps {
  profile: Profile;
  /** Buttons shown on the right-hand side of the row. */
  children?: React.ReactNode;
}

/** Avatar, display name and handle, linking through to the player's profile. */
export function PersonRow({ profile, children }: PersonRowProps) {
  const displayName = profile.full_name ?? profile.username;

  return (
    <div className="flex items-center gap-3 p-4 bg-surface border border-border rounded-xl">
      <Link href={`/players/${profile.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar src={profile.avatar_url} name={displayName} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text truncate">{displayName}</p>
          <p className="text-xs text-text-muted">@{profile.username}</p>
        </div>
      </Link>
      {children && <div className="flex gap-2 flex-shrink-0">{children}</div>}
    </div>
  );
}
