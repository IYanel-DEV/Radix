'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiGet } from '@/lib/api';

interface SystemMetrics {
  cpu: { usagePercent: number; cores: number; model: string; loadAverage: number[] };
  memory: { totalGb: number; usedGb: number; freeGb: number; usagePercent: number };
  disk: { totalGb: number; usedGb: number; freeGb: number; usagePercent: number };
  network: { bytesReceived: number; bytesSent: number; interfaces: { name: string; rx: number; tx: number }[] };
  os: { platform: string; hostname: string; uptimeHours: number; release: string };
  processes: { total: number; running: number };
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res: any = await apiGet('/api/analytics/system');
        setMetrics(res?.data ?? res);
        setError(null);
      } catch (e: any) {
        setError(e.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" description="Real-time system analytics" />
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">No analytics data available</p>
        </div>
      </div>
    );
  }

  const formatBytes = (bps: number) => {
    if (bps < 1024) return `${bps} B/s`;
    if (bps < 1048576) return `${(bps / 1024).toFixed(1)} KB/s`;
    return `${(bps / 1048576).toFixed(1)} MB/s`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Real-time system analytics" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400">CPU Usage</p>
            <p className="text-2xl font-bold text-slate-100">{metrics.cpu.usagePercent}%</p>
            <p className="text-xs text-slate-500">{metrics.cpu.cores} cores - {metrics.cpu.model}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400">Memory Usage</p>
            <p className="text-2xl font-bold text-slate-100">{metrics.memory.usagePercent}%</p>
            <p className="text-xs text-slate-500">{metrics.memory.usedGb}GB / {metrics.memory.totalGb}GB</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400">Disk Usage</p>
            <p className="text-2xl font-bold text-slate-100">{metrics.disk.usagePercent}%</p>
            <p className="text-xs text-slate-500">{metrics.disk.usedGb}GB / {metrics.disk.totalGb}GB</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400">Network</p>
            <p className="text-2xl font-bold text-slate-100">{formatBytes(metrics.network.bytesReceived)}</p>
            <p className="text-xs text-slate-500">Down | Up: {formatBytes(metrics.network.bytesSent)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Network Interfaces</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.network.interfaces.length > 0 ? (
              <div className="space-y-2">
                {metrics.network.interfaces.map((iface) => (
                  <div key={iface.name} className="flex justify-between text-sm">
                    <span className="text-slate-300">{iface.name}</span>
                    <span className="text-slate-400">↓ {formatBytes(iface.rx)} ↑ {formatBytes(iface.tx)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No network interface data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Hostname</span>
              <span className="text-slate-200">{metrics.os.hostname}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Platform</span>
              <span className="text-slate-200">{metrics.os.platform}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Uptime</span>
              <span className="text-slate-200">{metrics.os.uptimeHours.toFixed(1)} hours</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Processes</span>
              <span className="text-slate-200">{metrics.processes.running} running</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
