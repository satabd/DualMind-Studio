import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/utils.js';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('bg-surface border border-border rounded-lg overflow-hidden flex flex-col', className)}
            {...props}
        />
    )
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                'flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-surface-muted',
                className
            )}
            {...props}
        />
    )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3
            ref={ref}
            className={cn('text-md font-semibold text-fg leading-tight', className)}
            {...props}
        />
    )
);
CardTitle.displayName = 'CardTitle';

export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('flex flex-col gap-3 px-4 py-3', className)}
            {...props}
        />
    )
);
CardBody.displayName = 'CardBody';
