'use client';

import { Cpu, HardDrive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RealtimeValue } from '@/components/ui/realtime-value';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PerformanceSummaryProps {
  cpuUsage: number;
  ramUsage: number;
  cpuHistory: number[];
  ramHistory: number[];
}

export function PerformanceSummary({
  cpuUsage,
  ramUsage,
  cpuHistory,
  ramHistory,
}: PerformanceSummaryProps) {
  const maxVal = 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="h-4 w-4 text-amber-400" />
            CPU Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 mb-3">
            <span className={cn(
              'text-3xl font-bold',
              cpuUsage > 80 ? 'text-red-400' : cpuUsage > 60 ? 'text-amber-400' : 'text-radix-400'
            )}>
              <RealtimeValue value={Math.round(cpuUsage)} suffix="%" />
            </span>
          </div>
          <Progress
            value={cpuUsage}
            className="h-2"
            indicatorClassName={
              cpuUsage > 80 ? 'bg-red-500' : cpuUsage > 60 ? 'bg-amber-500' : 'bg-radix-500'
            }
          />
          <div className="mt-3 flex gap-0.5 items-end h-8">
            {cpuHistory.slice(-40).map((val, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm transition-all duration-300"
                style={{
                  height: `${(val / maxVal) * 100}%`,
                  backgroundColor: val > 80 ? '#ef4444' : val > 60 ? '#f59e0b' : '#a855f7',
                  opacity: 0.3 + (i / cpuHistory.slice(-40).length) * 0.7,
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-purple-400" />
            RAM Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 mb-3">
            <span className={cn(
              'text-3xl font-bold',
              ramUsage > 80 ? 'text-red-400' : ramUsage > 60 ? 'text-amber-400' : 'text-radix-400'
            )}>
              <RealtimeValue value={Math.round(ramUsage)} suffix="%" />
            </span>
          </div>
          <Progress
            value={ramUsage}
            className="h-2"
            indicatorClassName={
              ramUsage > 80 ? 'bg-red-500' : ramUsage > 60 ? 'bg-amber-500' : 'bg-radix-500'
            }
          />
          <div className="mt-3 flex gap-0.5 items-end h-8">
            {ramHistory.slice(-40).map((val, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm transition-all duration-300"
                style={{
                  height: `${(val / maxVal) * 100}%`,
                  backgroundColor: val > 80 ? '#ef4444' : val > 60 ? '#f59e0b' : '#a855f7',
                  opacity: 0.3 + (i / ramHistory.slice(-40).length) * 0.7,
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
