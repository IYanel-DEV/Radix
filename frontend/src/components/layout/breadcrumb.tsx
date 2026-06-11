'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-1.5 text-sm', className)}>
      <Link
        href="/dashboard"
        className="text-slate-500 hover:text-slate-300 transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <ChevronRight className="h-4 w-4 text-slate-600" />
          {item.href ? (
            <Link
              href={item.href}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-200 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
