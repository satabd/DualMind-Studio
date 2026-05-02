import { forwardRef } from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '../lib/utils.js';

export const Tabs = RadixTabs.Root;

export const TabsList = forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<typeof RadixTabs.List>
>(({ className, ...props }, ref) => (
    <RadixTabs.List
        ref={ref}
        className={cn(
            'inline-flex items-center gap-1 p-1 rounded-md bg-surface-muted border border-border',
            className
        )}
        {...props}
    />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = forwardRef<
    HTMLButtonElement,
    React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(({ className, ...props }, ref) => (
    <RadixTabs.Trigger
        ref={ref}
        className={cn(
            'inline-flex items-center gap-1.5 h-7 px-3 rounded-sm text-sm font-medium text-fg-muted transition-colors',
            'hover:text-fg',
            'data-[state=active]:bg-surface data-[state=active]:text-fg data-[state=active]:shadow-sm',
            'focus-visible:outline-none focus-visible:shadow-focus',
            className
        )}
        {...props}
    />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(({ className, ...props }, ref) => (
    <RadixTabs.Content
        ref={ref}
        className={cn('focus-visible:outline-none', className)}
        {...props}
    />
));
TabsContent.displayName = 'TabsContent';
