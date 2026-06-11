'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatusDotProps {
  status: 'online' | 'offline' | 'starting' | 'stopping' | 'crashed' | 'updating' | 'running' | 'stopped' | 'stopped_by_watchdog';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const statusColors: Record<string, string> = {
  online: 'bg-radix-500 shadow-radix-500/50',
  running: 'bg-radix-500 shadow-radix-500/50',
  offline: 'bg-slate-600',
  stopped: 'bg-slate-600',
  starting: 'bg-amber-500 shadow-amber-500/50',
  stopping: 'bg-orange-500 shadow-orange-500/50',
  crashed: 'bg-red-500 shadow-red-500/50',
  stopped_by_watchdog: 'bg-red-700 shadow-red-700/50',
  updating: 'bg-blue-500 shadow-blue-500/50',
};

const sizeMap = { sm: 'w-1.5 h-1.5', md: 'w-2.5 h-2.5', lg: 'w-3.5 h-3.5' };

export function StatusDot({
  status,
  size = 'md',
  className,
  label,
}: StatusDotProps) {
  const isPulsing = status === 'starting' || status === 'stopping';

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <motion.span
        className={cn(
          'rounded-full',
          statusColors[status] || 'bg-slate-500',
          sizeMap[size],
          isPulsing && 'animate-pulse'
        )}
        animate={
          status === 'running' || status === 'online'
            ? { scale: [1, 1.2, 1] }
            : undefined
        }
        transition={
          status === 'running' || status === 'online'
            ? { duration: 2, repeat: Infinity }
            : undefined
        }
      />
      {label && (
        <span className="text-xs text-slate-400 capitalize">{label}</span>
      )}
    </span>
  );
}
