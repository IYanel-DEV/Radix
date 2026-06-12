'use client';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeMap = { sm: 16, md: 24, lg: 36 };
  const px = sizeMap[size];

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className="rounded-full border-2 border-zinc-800 border-t-violet-500 animate-spin"
        style={{ width: px, height: px }}
      />
    </div>
  );
}
