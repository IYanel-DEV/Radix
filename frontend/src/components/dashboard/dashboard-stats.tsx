'use client';

import { Server, Users, Cpu, HardDrive, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { DashboardStats } from '@/types';

interface DashboardStatsProps {
  stats: DashboardStats;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard
        icon={<Server className="h-5 w-5 text-radix-400" />}
        label="Online Servers"
        value={stats.onlineServers}
        trend={{ value: stats.serverTrend, positive: stats.serverTrend >= 0 }}
      />
      <StatCard
        icon={<Wifi className="h-5 w-5 text-red-400" />}
        label="Offline Servers"
        value={stats.offlineServers}
      />
      <StatCard
        icon={<Users className="h-5 w-5 text-blue-400" />}
        label="Total Players"
        value={stats.totalPlayers}
        trend={{ value: stats.playerTrend, positive: stats.playerTrend >= 0 }}
      />
      <StatCard
        icon={<Cpu className="h-5 w-5 text-amber-400" />}
        label="CPU Usage"
        value={`${Math.round(stats.averageCpu)}%`}
        progress={stats.averageCpu}
        progressColor={stats.averageCpu > 80 ? 'bg-red-500' : stats.averageCpu > 60 ? 'bg-amber-500' : 'bg-radix-500'}
      />
      <StatCard
        icon={<HardDrive className="h-5 w-5 text-purple-400" />}
        label="RAM Usage"
        value={`${Math.round(stats.averageRam)}%`}
        progress={stats.averageRam}
        progressColor={stats.averageRam > 80 ? 'bg-red-500' : stats.averageRam > 60 ? 'bg-amber-500' : 'bg-radix-500'}
      />
      <StatCard
        icon={<ShieldCheck className="h-5 w-5 text-cyan-400" />}
        label="Active Admins"
        value={stats.totalAdmins}
      />
    </div>
  );
}
