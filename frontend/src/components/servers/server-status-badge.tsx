'use client';

import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/ui/status-dot';
import type { ServerStatus } from '@/types';
import { cn } from '@/lib/utils';

interface ServerStatusBadgeProps {
  status: ServerStatus;
  showDot?: boolean;
  className?: string;
}

const statusLabels: Record<ServerStatus, string> = {
  stopped: 'Stopped',
  starting: 'Starting',
  running: 'Running',
  stopping: 'Stopping',
  crashed: 'Crashed',
  updating: 'Updating',
  stopped_by_watchdog: 'Stopped (Watchdog)',
};

const statusVariants: Record<string, 'default' | 'destructive' | 'outline' | 'success' | 'secondary' | 'warning'> = {
  stopped: 'secondary',
  starting: 'warning',
  running: 'success',
  stopping: 'warning',
  crashed: 'destructive',
  updating: 'default',
  stopped_by_watchdog: 'destructive',
};

export function ServerStatusBadge({ status, showDot = true, className }: ServerStatusBadgeProps) {
  return (
    <Badge
      variant={statusVariants[status] || 'default'}
      className={cn('inline-flex items-center gap-1.5', className)}
    >
      {showDot && <StatusDot status={status} size="sm" />}
      {statusLabels[status] || status}
    </Badge>
  );
}
