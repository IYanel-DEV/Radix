'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FilterOption } from '@/types';

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

interface FilterBarProps {
  filters: FilterOption[];
  activeFilters: ActiveFilter[];
  onAddFilter: (key: string, value: string) => void;
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function FilterBar({
  filters,
  activeFilters,
  onAddFilter,
  onRemoveFilter,
  onClearAll,
  className,
}: FilterBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {filters.map((filter) => {
        const isActive = activeFilters.some((af) => af.value === filter.value);
        return (
          <Badge
            key={filter.value}
            variant={isActive ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer transition-all duration-200',
              isActive
                ? 'bg-radix-500/10 text-radix-400 border-radix-500/20'
                : 'hover:border-white/20'
            )}
            onClick={() => {
              if (isActive) {
                onRemoveFilter(filter.value);
              } else {
                onAddFilter(filter.key, filter.value);
              }
            }}
          >
            {filter.label}
            {isActive && (
              <X className="ml-1 h-3 w-3" onClick={(e) => {
                e.stopPropagation();
                onRemoveFilter(filter.value);
              }} />
            )}
          </Badge>
        );
      })}
      {activeFilters.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
