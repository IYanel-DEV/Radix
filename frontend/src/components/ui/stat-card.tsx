'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    positive: boolean;
  };
  progress?: number;
  progressColor?: string;
  className?: string;
}

export function StatCard({
  icon,
  label,
  value,
  trend,
  progress,
  progressColor,
  className,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        'rounded-xl border border-white/5 bg-card/60 backdrop-blur-xl p-5 shadow-lg transition-colors duration-200 hover:border-white/20',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="rounded-lg bg-white/5 p-2.5">{icon}</div>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
              trend.positive
                ? 'bg-radix-500/10 text-radix-400'
                : 'bg-red-500/10 text-red-400'
            )}
          >
            {trend.positive ? '+' : ''}
            {trend.value}%
          </span>
        )}
      </div>
      <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </h4>
      <p className="text-2xl font-bold text-white">{value}</p>
      {progress !== undefined && (
        <div className="mt-3">
          <div className="h-1.5 w-full rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                progressColor || 'bg-radix-500'
              )}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
