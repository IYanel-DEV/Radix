'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart } from '@/components/ui/chart';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useServerStore } from '@/stores/server-store';
import { RealtimeValue } from '@/components/ui/realtime-value';

interface ServerPerformanceProps {
  serverId: string;
}

export function ServerPerformance({ serverId }: ServerPerformanceProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const metrics = useServerStore((s) => s.serverMetrics[serverId] || []);
  const server = useServerStore((s) => s.servers.find((sv) => sv.id === serverId));

  const chartData = metrics.slice(-60).map((m) => ({
    time: new Date(m.timestamp).toLocaleTimeString(),
    cpu: m.cpuUsage,
    ram: m.ramUsage,
    networkIn: m.networkIn,
    networkOut: m.networkOut,
    tickRate: m.tickRate,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Performance Metrics</h2>
        <div className="flex items-center gap-2">
          <Label htmlFor="auto-refresh" className="text-xs text-slate-400">Auto-refresh</Label>
          <Switch
            id="auto-refresh"
            checked={autoRefresh}
            onCheckedChange={setAutoRefresh}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">CPU Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100 mb-4">
              <RealtimeValue value={Math.round(server?.cpuUsage || 0)} suffix="%" />
            </div>
            <LineChart
              data={chartData}
              height={180}
              categories={[{ key: 'cpu', color: '#f59e0b', name: 'CPU %' }]}
              xAxisKey="time"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">RAM Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100 mb-4">
              <RealtimeValue value={Math.round(server?.ramUsage || 0)} suffix="%" />
            </div>
            <LineChart
              data={chartData}
              height={180}
              categories={[{ key: 'ram', color: '#a855f7', name: 'RAM %' }]}
              xAxisKey="time"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Network</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={chartData}
              height={180}
              categories={[
                { key: 'networkIn', color: '#3b82f6', name: 'In' },
                { key: 'networkOut', color: '#06b6d4', name: 'Out' },
              ]}
              xAxisKey="time"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tick Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100 mb-4">
              <RealtimeValue value={server?.tickRate || 0} suffix=" Hz" />
            </div>
            <LineChart
              data={chartData}
              height={180}
              categories={[                { key: 'tickRate', color: '#a855f7', name: 'Tick Rate' }]}
              xAxisKey="time"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
