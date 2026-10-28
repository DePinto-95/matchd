'use client';

import { useRouter } from 'next/navigation';
import { Mail, Share2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SPORTS } from '@matchd/shared/constants/sports';
import { Notification } from '@matchd/shared/types';
import { NotificationType } from '@matchd/shared/enums';
import {
  getNotificationData,
  getNotificationIcon,
  getNotificationTarget,
  MATCH_NOTIFICATION_TYPES,
} from '../lib/notificationDisplay';

interface NotificationRowProps {
  notification: Notification;
  onRead: (id: string) => void | Promise<void>;
  onUnread: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationRow({
  notification: n,
  onRead,
  onUnread,
  onDelete,
}: NotificationRowProps) {
  const router = useRouter();

  const iconSpec = getNotificationIcon(n.type);
  const sport = MATCH_NOTIFICATION_TYPES.includes(n.type)
    ? getNotificationData(n).sport
    : undefined;
  const sportEmoji = sport ? (SPORTS[sport]?.emoji ?? '🏅') : null;

  const open = async () => {
    if (!n.read) await onRead(n.id);
    const target = getNotificationTarget(n);
    if (target) router.push(target);
  };

  const cornerButton = 'absolute top-2 p-1 rounded-md text-text-muted opacity-0 group-hover:opacity-100 hover:text-text hover:bg-surface-alt transition-all';

  return (
    <div className="relative group">
      <button
        onClick={open}
        className={`w-full text-left p-4 rounded-xl border transition-all
          ${n.read ? 'bg-surface border-border' : 'bg-brand/5 border-brand/30 hover:bg-brand/10'}`}
      >
        <div className="flex items-start gap-3">
          {!n.read && <div className="w-2 h-2 rounded-full bg-brand mt-1.5 flex-shrink-0" />}
          <div className={`flex items-start gap-2 flex-1 ${n.read ? 'pl-5' : ''}`}>
            {/* Match invites show the sport emoji; everything else an icon. */}
            {n.type === NotificationType.MatchInvite && sportEmoji ? (
              <span className="text-base leading-none flex-shrink-0">{sportEmoji}</span>
            ) : iconSpec ? (
              <iconSpec.icon className={`w-4 h-4 ${iconSpec.className} flex-shrink-0 mt-0.5`} />
            ) : (
              <Share2 className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
            )}

            <div className="flex-1 pr-6">
              <p className="text-sm font-medium text-text">{n.title}</p>
              {n.body && <p className="text-xs text-text-muted mt-0.5">{n.body}</p>}
              <p className="text-xs text-text-muted mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      </button>

      {n.read && (
        <button
          onClick={() => onUnread(n.id)}
          className={`${cornerButton} right-8`}
          aria-label="Mark as unread"
          title="Mark as unread"
        >
          <Mail className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        onClick={() => onDelete(n.id)}
        className={`${cornerButton} right-2`}
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
