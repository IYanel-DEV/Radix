'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart } from '@/components/ui/chart';

interface ServerStatusChartProps {
  data: Array<{ time: string; online: number; offline: number }>;
}

export function ServerStatusChart({ data }: ServerStatusChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Server Status Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <AreaChart
          data={data}
          height={200}
          categories={[
            { key: 'online', color: '#10b981', name: 'Online' },
            { key: 'offline', color: '#ef4444', name: 'Offline' },
          ]}
          xAxisKey="time"
        />
      </CardContent>
    </Card>
  );
}
