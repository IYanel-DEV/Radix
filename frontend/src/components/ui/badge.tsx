import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200',
  {
    variants: {
      variant: {
        default: 'bg-white/5 text-slate-300 hover:bg-white/10',
        secondary: 'bg-white/5 text-slate-400',
        destructive: 'bg-red-500/10 text-red-400 border border-red-500/20',
        outline: 'border border-white/10 text-slate-300',
        success: 'bg-radix-500/10 text-radix-400 border border-radix-500/20',
        warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
