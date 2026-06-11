'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  Server,
  UserPlus,
  UserMinus,
  Ban,
  AlertTriangle,
  AlertCircle,
  Info,
  Package,
} from 'lucide-react';
import { useNotificationStore } from '@/stores/notification-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: UserPlus,
  warning: AlertTriangle,
  error: AlertCircle,
};

const colorMap: Record<string, string> = {
  info: 'text-blue-400',
  success: 'text-radix-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
};

export function NotificationDropdown() {
  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3">
        <h4 className="text-sm font-semibold text-slate-100">Notifications</h4>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-xs text-radix-400 hover:text-radix-300 h-auto p-0"
          >
            Mark all read
          </Button>
        )}
      </div>
      <Separator />
      <ScrollArea className="h-[360px]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <Info className="h-8 w-8 mb-2" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const Icon = iconMap[notif.type] || Info;
            const color = colorMap[notif.type] || 'text-slate-400';
            return (
              <button
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                className={cn(
                  'w-full text-left px-4 py-3 transition-colors hover:bg-slate-800/50',
                  !notif.isRead && 'bg-slate-800/30'
                )}
              >
                <div className="flex gap-3">
                  <div className={cn('mt-0.5', color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm leading-tight',
                      notif.isRead ? 'text-slate-400' : 'text-slate-200'
                    )}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="h-2 w-2 rounded-full bg-radix-500 mt-1.5 shrink-0" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
}
