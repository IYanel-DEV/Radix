'use client';

import { formatDistanceToNow } from 'date-fns';
import { ScrollText, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AuditLog } from '@/types';
import { cn } from '@/lib/utils';

interface RecentEventsProps {
  events: AuditLog[];
}

const actionSeverity: Record<string, 'info' | 'warning' | 'error'> = {
  SERVER_CRASHED: 'error',
  SERVER_FAILED: 'error',
  BAN_CREATED: 'warning',
  PLAYER_BANNED: 'warning',
  PLAYER_KICKED: 'warning',
  USER_DELETED: 'warning',
  LOGIN_FAILED: 'warning',
};

function getSeverity(action: string): 'info' | 'warning' | 'error' {
  return actionSeverity[action] || 'info';
}

const severityConfig = {
  info: { icon: Info, color: 'text-blue-400', badge: 'default' as const },
  warning: { icon: AlertTriangle, color: 'text-amber-400', badge: 'warning' as const },
  error: { icon: AlertCircle, color: 'text-red-400', badge: 'destructive' as const },
};

export function RecentEvents({ events }: RecentEventsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-slate-400" />
          Recent Events
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px]">
          {events.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-slate-500">
              No recent events
            </div>
          ) : (
            <div className="space-y-0">
              {events.map((event) => {
                const sev = severityConfig[getSeverity(event.action)];
                const Icon = sev.icon;
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 px-6 py-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/30 transition-colors"
                  >
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', sev.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-200 font-medium">
                          {event.action}
                        </span>
                        <Badge variant={sev.badge as any} className="text-[10px] px-1.5 py-0">
                          {getSeverity(event.action)}
                        </Badge>
                      </div>
                      {event.details && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {typeof event.details === 'string' ? event.details : JSON.stringify(event.details)}
                        </p>
                      )}
                      <p className="text-xs text-slate-600 mt-1">
                        by {event.username} &middot;{' '}
                        {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}