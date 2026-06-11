'use client';

import {
  LineChart as RechartsLine,
  BarChart as RechartsBar,
  AreaChart as RechartsArea,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

interface ChartProps {
  data: any[];
  categories: Array<{
    key: string;
    color: string;
    name?: string;
  }>;
  xAxisKey?: string;
  height?: number;
  className?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
}

const defaultColors = {
  emerald: '#a855f7',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0B0A0F] px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export function LineChart({
  data,
  categories,
  xAxisKey = 'name',
  height = 300,
  className,
  showGrid = true,
  showLegend = false,
  showTooltip = true,
}: ChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLine data={data}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          )}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#1e293b' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#1e293b' }}
            tickLine={false}
          />
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {showLegend && <Legend />}
          {categories.map((cat) => (
            <Line
              key={cat.key}
              type="monotone"
              dataKey={cat.key}
              name={cat.name || cat.key}
              stroke={cat.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: cat.color }}
            />
          ))}
        </RechartsLine>
      </ResponsiveContainer>
    </div>
  );
}

export function BarChart({
  data,
  categories,
  xAxisKey = 'name',
  height = 300,
  className,
  showGrid = true,
  showLegend = false,
  showTooltip = true,
}: ChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBar data={data} barSize={20}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          )}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#1e293b' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#1e293b' }}
            tickLine={false}
          />
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {showLegend && <Legend />}
          {categories.map((cat) => (
            <Bar
              key={cat.key}
              dataKey={cat.key}
              name={cat.name || cat.key}
              fill={cat.color}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBar>
      </ResponsiveContainer>
    </div>
  );
}

export function AreaChart({
  data,
  categories,
  xAxisKey = 'name',
  height = 300,
  className,
  showGrid = true,
  showLegend = false,
  showTooltip = true,
}: ChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsArea data={data}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          )}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#1e293b' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#1e293b' }}
            tickLine={false}
          />
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {showLegend && <Legend />}
          {categories.map((cat) => (
            <defs key={`gradient-${cat.key}`}>
              <linearGradient id={`gradient-${cat.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cat.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={cat.color} stopOpacity={0} />
              </linearGradient>
            </defs>
          ))}
          {categories.map((cat) => (
            <Area
              key={cat.key}
              type="monotone"
              dataKey={cat.key}
              name={cat.name || cat.key}
              stroke={cat.color}
              strokeWidth={2}
              fill={`url(#gradient-${cat.key})`}
              dot={false}
            />
          ))}
        </RechartsArea>
      </ResponsiveContainer>
    </div>
  );
}

export { defaultColors };
