'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RealtimeValueProps {
  value: number;
  duration?: number;
  format?: boolean;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function RealtimeValue({
  value,
  duration = 0.5,
  format = false,
  prefix,
  suffix,
  decimals = 0,
  className,
}: RealtimeValueProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const startValue = displayValue;
    const diff = value - startValue;
    const startTime = performance.now();

    if (diff === 0) return;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + diff * eased);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  const formattedValue = format
    ? new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(displayValue)
    : displayValue.toFixed(decimals);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={displayValue.toFixed(decimals)}
        className={cn('tabular-nums', className)}
      >
        {prefix}
        {formattedValue}
        {suffix}
      </motion.span>
    </AnimatePresence>
  );
}
