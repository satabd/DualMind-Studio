import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils.js';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-focus',
    {
        variants: {
            variant: {
                primary: 'bg-accent text-white hover:opacity-90 active:opacity-80',
                secondary: 'bg-surface-strong text-fg hover:bg-border',
                ghost: 'bg-transparent text-fg-muted hover:bg-surface-muted hover:text-fg',
                danger: 'bg-danger text-white hover:opacity-90'
            },
            size: {
                sm: 'h-7 px-2.5 text-xs',
                md: 'h-9 px-3 text-sm',
                lg: 'h-10 px-4 text-md'
            }
        },
        defaultVariants: { variant: 'secondary', size: 'md' }
    }
);

export interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => (
        <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    )
);
Button.displayName = 'Button';
