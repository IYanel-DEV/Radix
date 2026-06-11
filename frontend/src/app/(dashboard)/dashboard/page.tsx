'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { RecentEvents } from '@/components/dashboard/recent-events';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { useServerStore } from '@/stores/server-store';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { DashboardStats as DashboardStatsType, AuditLog } from '@/types';

export default function DashboardPage() {
  const { servers, fetchServers, loading } = useServerStore();

  useEffect(() => {
    fetchServers();
  }, []);

  const stats: DashboardStatsType = {
    totalServers: servers.length,
    onlineServers: servers.filter((s) => s.status === 'running').length,
    offlineServers: servers.filter((s) => s.status === 'stopped' || s.status === 'crashed').length,
    totalPlayers: servers.reduce((sum, s) => sum + s.playerCount, 0),
    totalAdmins: 0,
    averageCpu: servers.length > 0 ? servers.reduce((sum, s) => sum + s.cpuUsage, 0) / servers.length : 0,
    averageRam: servers.length > 0 ? servers.reduce((sum, s) => sum + s.ramUsage, 0) / servers.length : 0,
    serversByStatus: {
      running: servers.filter((s) => s.status === 'running').length,
      stopped: servers.filter((s) => s.status === 'stopped').length,
      starting: servers.filter((s) => s.status === 'starting').length,
      stopping: servers.filter((s) => s.status === 'stopping').length,
      crashed: servers.filter((s) => s.status === 'crashed').length,
      updating: servers.filter((s) => s.status === 'updating').length,
    },
    playerTrend: servers.length > 0 ? 0 : 0,
    serverTrend: servers.length > 0 ? 0 : 0,
    cpuTrend: 0,
    ramTrend: 0,
  };

  const recentEvents: AuditLog[] = [];

  if (loading && servers.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>

      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-slate-200 mb-4">Server Status</h3>
          {servers.length > 0 ? (
            <div className="space-y-3">
              {servers.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.engineType?.toUpperCase()} | Port {s.port}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    s.status === 'running' ? 'bg-green-500/20 text-green-400' :
                    s.status === 'crashed' ? 'bg-red-500/20 text-red-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-500">
              No servers available. Create one to get started.
            </div>
          )}
        </div>
        <div className="space-y-6">
          <QuickActions />
          <RecentEvents events={recentEvents} />
        </div>
      </div>
    </motion.div>
  );
}
