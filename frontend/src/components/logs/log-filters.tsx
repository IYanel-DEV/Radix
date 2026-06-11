'use client';

import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LogFiltersProps {
  levels: string[];
  activeLevel: string;
  onLevelChange: (level: string) => void;
  sources: string[];
  activeSource: string;
  onSourceChange: (source: string) => void;
  className?: string;
}

export function LogFilters({
  levels,
  activeLevel,
  onLevelChange,
  sources,
  activeSource,
  onSourceChange,
  className,
}: LogFiltersProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
        <span className="text-[11px] text-slate-500 px-2">Level:</span>
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => onLevelChange(level)}
            className={cn(
              'px-2 py-1 text-[11px] rounded-md transition-colors capitalize',
              activeLevel === level
                ? 'bg-slate-700 text-slate-200'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {level}
          </button>
        ))}
      </div>

      {sources.length > 0 && (
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
          <span className="text-[11px] text-slate-500 px-2">Source:</span>
          <button
            onClick={() => onSourceChange('all')}
            className={cn(
              'px-2 py-1 text-[11px] rounded-md transition-colors',
              activeSource === 'all'
                ? 'bg-slate-700 text-slate-200'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            All
          </button>
          {sources.map((source) => (
            <button
              key={source}
              onClick={() => onSourceChange(source)}
              className={cn(
                'px-2 py-1 text-[11px] rounded-md transition-colors',
                activeSource === source
                  ? 'bg-slate-700 text-slate-200'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {source}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
