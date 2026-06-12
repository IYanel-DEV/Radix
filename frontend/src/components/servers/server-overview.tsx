'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServerStatusBadge } from './server-status-badge';
import { ServerActions } from './server-actions';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RealtimeValue } from '@/components/ui/realtime-value';
import type { Server } from '@/types';

interface ServerOverviewProps {
  server: Server;
}

export function ServerOverview({ server }: ServerOverviewProps) {
  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-zinc-50">{server.name}</h2>
          <ServerStatusBadge status={server.status} />
        </div>
        <ServerActions server={server} showLabel />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 uppercase tracking-wider">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-slate-100 capitalize">{server.status}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 uppercase tracking-wider">Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-slate-100">
              <RealtimeValue value={server.uptime} format />
              <span className="text-sm text-slate-500 ml-1">s</span>
            </p>
            <p className="text-xs text-slate-500">{formatUptime(server.uptime)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 uppercase tracking-wider">Version</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-slate-100">{server.buildVersion}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 uppercase tracking-wider">Region</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-slate-100 capitalize">{server.region}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Server Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Map</span>
              <p className="text-slate-200 font-medium mt-0.5">{server.map || 'N/A'}</p>
            </div>
            <div>
              <span className="text-slate-500">Game Mode</span>
              <p className="text-slate-200 font-medium mt-0.5">{server.gameMode || 'N/A'}</p>
            </div>
            <div>
              <span className="text-slate-500">Players</span>
              <p className="text-slate-200 font-medium mt-0.5">
                <RealtimeValue value={server.playerCount} /> / {server.maxPlayers}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Port</span>
              <p className="text-slate-200 font-medium mt-0.5">{server.port}</p>
            </div>
            <div>
              <span className="text-slate-500">Query Port</span>
              <p className="text-slate-200 font-medium mt-0.5">{server.queryPort}</p>
            </div>
            <div>
              <span className="text-slate-500">Auto Restart</span>
              <p className="text-slate-200 font-medium mt-0.5">
                <Badge variant={server.autoRestart ? 'success' : 'secondary'}>
                  {server.autoRestart ? 'Enabled' : 'Disabled'}
                </Badge>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
