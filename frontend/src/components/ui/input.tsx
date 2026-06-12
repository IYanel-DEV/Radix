'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, id, placeholder, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="relative">
        {label ? (
          <div className="relative">
            <input
              id={inputId}
              type={type}
              placeholder={placeholder || ' '}
              className={cn(
                'peer flex h-11 w-full rounded-lg border bg-zinc-900 px-3 pt-5 pb-1 text-sm text-zinc-100 placeholder-transparent',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:border-violet-500/50 focus-visible:ring-2 focus-visible:ring-violet-500/20',
                'disabled:cursor-not-allowed disabled:opacity-50',
                error
                  ? 'border-red-500/50 focus-visible:border-red-500/50 focus-visible:ring-red-500/20'
                  : 'border-zinc-800',
                className
              )}
              ref={ref}
              {...props}
            />
            <label
              htmlFor={inputId}
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 text-sm transition-all duration-150 pointer-events-none',
                'peer-placeholder-shown:text-zinc-500 peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2',
                'peer-focus:text-xs peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-violet-400',
                'peer-not-placeholder-shown:text-xs peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:-translate-y-0',
                error ? 'text-red-400' : 'text-zinc-500'
              )}
            >
              {label}
            </label>
          </div>
        ) : (
          <input
            id={inputId}
            type={type}
            placeholder={placeholder}
            className={cn(
              'flex h-9 w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:border-violet-500/50 focus-visible:ring-2 focus-visible:ring-violet-500/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-red-500/50 focus-visible:border-red-500/50 focus-visible:ring-red-500/20'
                : 'border-zinc-800',
              className
            )}
            ref={ref}
            {...props}
          />
        )}
        {error && (
          <p className="mt-1.5 text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
