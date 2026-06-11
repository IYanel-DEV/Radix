'use client';

import { motion } from 'framer-motion';
import { Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusDot } from '@/components/ui/status-dot';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Server as ServerType } from '@/types';

interface ServerHealthGridProps {
  servers: ServerType[];
}

export function ServerHealthGrid({ servers }: ServerHealthGridProps) {
  const statusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-radix-400';
      case 'starting': return 'text-amber-400';
      case 'stopping': return 'text-orange-400';
      case 'crashed': return 'text-red-400';
      default: return 'text-slate-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Server className="h-4 w-4 text-slate-400" />
          Server Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {servers.slice(0, 8).map((server, i) => (
            <motion.div
              key={server.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-lg border border-white/5 bg-white/5 p-3 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-300 truncate max-w-[120px]">
                  {server.name}
                </span>
                <StatusDot status={server.status as any} size="sm" />
              </div>
              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                    <span>CPU</span>
                    <span className={statusColor(server.status)}>{Math.round(server.cpuUsage)}%</span>
                  </div>
                  <Progress
                    value={server.cpuUsage}
                    className="h-1"
                    indicatorClassName={
                      server.cpuUsage > 80 ? 'bg-red-500' : server.cpuUsage > 60 ? 'bg-amber-500' : 'bg-radix-500'
                    }
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                    <span>RAM</span>
                    <span className={statusColor(server.status)}>{Math.round(server.ramUsage)}%</span>
                  </div>
                  <Progress
                    value={server.ramUsage}
                    className="h-1"
                    indicatorClassName={
                      server.ramUsage > 80 ? 'bg-red-500' : server.ramUsage > 60 ? 'bg-amber-500' : 'bg-radix-500'
                    }
                  />
                </div>
              </div>
            </motion.div>
          ))}
          {servers.length === 0 && (
            <div className="col-span-full text-center py-6 text-sm text-slate-500">
              No servers available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
