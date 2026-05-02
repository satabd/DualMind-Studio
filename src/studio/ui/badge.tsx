import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils.js';

const badgeVariants = cva(
    'inline-flex items-center gap-1 font-medium border whitespace-nowrap leading-none',
    {
        variants: {
            variant: {
                default: 'bg-surface-muted text-fg-muted border-border',
                running: 'bg-success-soft text-success border-success/30',
                paused: 'bg-warning-soft text-warning border-warning/30',
                idle: 'bg-surface-muted text-fg-subtle border-border',
                success: 'bg-success-soft text-success border-success/30',
                escalation: 'bg-danger-soft text-danger border-danger/30',
                'seat-a': 'bg-seat-a-soft text-seat-a border-seat-a/30',
                'seat-b': 'bg-seat-b-soft text-seat-b border-seat-b/30',
                system: 'bg-system-soft text-system border-system/30',
                accent: 'bg-accent-soft text-accent border-accent/30'
            },
            size: {
                sm: 'h-5 px-1.5 text-xs rounded-sm',
                md: 'h-6 px-2 text-xs rounded-md'
            }
        },
        defaultVariants: { variant: 'default', size: 'md' }
    }
);

export interface BadgeProps
    extends HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant, size, ...props }, ref) => (
        <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props} />
    )
);
Badge.displayName = 'Badge';
