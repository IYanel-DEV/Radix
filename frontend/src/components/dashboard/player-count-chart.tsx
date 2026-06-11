'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart } from '@/components/ui/chart';

interface PlayerCountChartProps {
  data: Array<{ time: string; players: number; max: number }>;
}

export function PlayerCountChart({ data }: PlayerCountChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Player Count (24h)</CardTitle>
      </CardHeader>
      <CardContent>
        <LineChart
          data={data}
          height={200}
          categories={[
            { key: 'players', color: '#3b82f6', name: 'Players' },
            { key: 'max', color: '#64748b', name: 'Max Capacity' },
          ]}
          xAxisKey="time"
        />
      </CardContent>
    </Card>
  );
}
