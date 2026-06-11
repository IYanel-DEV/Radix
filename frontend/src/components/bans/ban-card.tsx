'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Ban } from '@/types';

interface BanCardProps {
  ban: Ban;
}

export function BanCard({ ban }: BanCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {ban.playerUsername || 'Unknown Player'}
          </CardTitle>
          <Badge variant={ban.isActive ? 'destructive' : 'secondary'}>
            {ban.isActive ? 'Active' : 'Expired'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-slate-500 text-xs">Player ID</span>
            <p className="text-slate-200 font-mono text-xs">{ban.playerId || '-'}</p>
          </div>
          <div>
            <span className="text-slate-500 text-xs">IP</span>
            <p className="text-slate-200 font-mono text-xs">{ban.ipAddress || '-'}</p>
          </div>
          <div>
            <span className="text-slate-500 text-xs">Duration</span>
            <p className="text-slate-200">{ban.isPermanent ? 'Permanent' : 'Temporary'}</p>
          </div>
        </div>
        <Separator />
        <div className="text-sm">
          <span className="text-slate-500 text-xs">Reason</span>
          <p className="text-slate-200 mt-0.5">{ban.reason}</p>
        </div>
        <div className="text-xs text-slate-500 space-y-0.5">
          <p>Banned by: {ban.bannedBy}</p>
          <p>Date: {format(new Date(ban.createdAt), 'MMM d, yyyy HH:mm')}</p>
          {ban.expiresAt && (
            <p>Expires: {format(new Date(ban.expiresAt), 'MMM d, yyyy HH:mm')}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
