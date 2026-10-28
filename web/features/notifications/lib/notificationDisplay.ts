import { HelpCircle, LucideIcon, Share2, Star, Trophy, Users } from 'lucide-react';
import { Notification } from '@matchd/shared/types';
import { NotificationType, SportType } from '@matchd/shared/enums';

/** `notifications.data` is jsonb; these are the keys the app puts in it. */
interface NotificationData {
  match_id?: string;
  invite_code?: string;
  sport?: SportType;
}

export const getNotificationData = (n: Notification): NotificationData =>
  (n.data as NotificationData | null) ?? {};

/**
 * Where clicking a notification goes, or null for ones that are informational.
 *
 * Every NotificationType has an entry, so a type with no destination is a
 * visible decision rather than an accident.
 *
 * KNOWN GAP (MD-06): ResultDisputed returns null, so clicking one does
 * nothing, even though the user needs to go to the match to respond to the
 * dispute. The fix is to return the match route here, as MatchCompleted does.
 */
export const getNotificationTarget = (n: Notification): string | null => {
  const { match_id, invite_code } = getNotificationData(n);

  switch (n.type) {
    case NotificationType.FriendRequest:
    case NotificationType.FriendAccepted:
      return '/friends';

    case NotificationType.MatchInvite:
      if (!match_id) return null;
      // Private matches need the code, or the join panel stays locked.
      return invite_code
        ? `/matches/${match_id}?code=${encodeURIComponent(invite_code)}`
        : `/matches/${match_id}`;

    case NotificationType.MatchCompleted:
    case NotificationType.MatchHappenedCheck:
      return match_id ? `/matches/${match_id}` : null;

    case NotificationType.RatePlayers:
      return match_id ? `/matches/${match_id}/rate` : null;

    case NotificationType.ResultDisputed:
      return null; // MD-06

    default:
      return null;
  }
};

interface NotificationIcon {
  icon: LucideIcon;
  className: string;
}

/** The icon shown beside a notification. Match invites use the sport emoji. */
export const getNotificationIcon = (type: Notification['type']): NotificationIcon | null => {
  switch (type) {
    case NotificationType.FriendRequest:
    case NotificationType.FriendAccepted:
      return { icon: Users, className: 'text-brand' };
    case NotificationType.RatePlayers:
      return { icon: Star, className: 'text-brand' };
    case NotificationType.MatchCompleted:
      return { icon: Trophy, className: 'text-warning' };
    case NotificationType.MatchHappenedCheck:
      return { icon: HelpCircle, className: 'text-brand' };
    case NotificationType.MatchInvite:
      return { icon: Share2, className: 'text-brand' };
    default:
      return null;
  }
};

/** Match-related notifications carry their sport, used for the emoji. */
export const MATCH_NOTIFICATION_TYPES: Notification['type'][] = [
  NotificationType.MatchInvite,
  NotificationType.MatchCompleted,
  NotificationType.MatchHappenedCheck,
  NotificationType.RatePlayers,
];
