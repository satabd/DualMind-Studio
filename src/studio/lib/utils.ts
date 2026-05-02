import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

// Stable HH:MM:SS in the user's locale.  We deliberately do NOT include the
// date — turn timestamps live inside session cards and the date is implied.
export function formatTimestamp(ts?: number): string {
    if (!ts) return '';
    try {
        const d = new Date(ts);
        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch {
        return '';
    }
}
