'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, Users, Clock, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ServerStatusBadge } from './server-status-badge';
import { ServerActions } from './server-actions';
import { RealtimeValue } from '@/components/ui/realtime-value';
import type { Server } from '@/types';
import { cn } from '@/lib/utils';

interface ServerCardProps {
  server: Server;
  index: number;
}

export function ServerCard({ server, index }: ServerCardProps) {
  const router = useRouter();

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01, y: -2 }}
    >
      <Card
        className="cursor-pointer transition-all duration-200 hover:border-slate-700 hover:shadow-xl hover:shadow-black/30"
        onClick={() => router.push(`/servers/${server.id}`)}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-slate-100 truncate">
                  {server.name}
                </h3>
                <ServerStatusBadge status={server.status} />
              </div>
              {server.description && (
                <p className="text-sm text-slate-500 truncate">{server.description}</p>
              )}
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <ServerActions server={server} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <MapPin className="h-4 w-4 text-slate-500" />
              <span>{server.map || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Users className="h-4 w-4 text-slate-500" />
              <span>
                <RealtimeValue value={server.playerCount} />
                /{server.maxPlayers}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Globe className="h-4 w-4 text-slate-500" />
              <span className="capitalize">{server.region}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock className="h-4 w-4 text-slate-500" />
              <span>{formatUptime(server.uptime)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>CPU</span>
                <span className={cn(
          'font-medium',
                   server.cpuUsage > 80 ? 'text-red-400' : server.cpuUsage > 60 ? 'text-amber-400' : 'text-radix-400'
                )}>
                  <RealtimeValue value={Math.round(server.cpuUsage)} suffix="%" />
                </span>
              </div>
              <Progress
                value={server.cpuUsage}
                className="h-1.5"
                indicatorClassName={
                  server.cpuUsage > 80 ? 'bg-red-500' : server.cpuUsage > 60 ? 'bg-amber-500' : 'bg-radix-500'
                }
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>RAM</span>
                <span className={cn(
                  'font-medium',
                  server.ramUsage > 80 ? 'text-red-400' : server.ramUsage > 60 ? 'text-amber-400' : 'text-radix-400'
                )}>
                  <RealtimeValue value={Math.round(server.ramUsage)} suffix="%" />
                </span>
              </div>
              <Progress
                value={server.ramUsage}
                className="h-1.5"
                indicatorClassName={
                  server.ramUsage > 80 ? 'bg-red-500' : server.ramUsage > 60 ? 'bg-amber-500' : 'bg-radix-500'
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
