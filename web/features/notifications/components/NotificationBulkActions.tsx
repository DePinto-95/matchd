import { CheckCheck, MailOpen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface NotificationBulkActionsProps {
  unreadCount: number;
  readCount: number;
  onMarkAllRead: () => void;
  onClearRead: () => void;
  onClearAll: () => void;
}

/** "Mark all read" / "Clear read" / "Clear all", each shown only when it applies. */
export function NotificationBulkActions({
  unreadCount,
  readCount,
  onMarkAllRead,
  onClearRead,
  onClearAll,
}: NotificationBulkActionsProps) {
  return (
    <div className="flex items-center gap-1">
      {unreadCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
          <CheckCheck className="w-4 h-4" />
          Mark all read
        </Button>
      )}
      {readCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClearRead}>
          <MailOpen className="w-4 h-4" />
          Clear read
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onClearAll}>
        <Trash2 className="w-4 h-4" />
        Clear all
      </Button>
    </div>
  );
}
