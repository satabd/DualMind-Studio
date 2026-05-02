import type { Config } from 'tailwindcss';

// Token bridge: maps the CSS variables defined in src/studio.css to Tailwind
// utility classes (bg-bg, text-fg-muted, border-seat-a/50, etc).  Components
// can stay agnostic about hex codes — they consume semantic tokens only.

const config: Config = {
    content: ['./src/studio.html', './src/studio.tsx', './src/studio/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                bg: 'var(--color-bg)',
                surface: 'var(--color-surface)',
                'surface-elevated': 'var(--color-surface-elevated)',
                'surface-muted': 'var(--color-surface-muted)',
                'surface-strong': 'var(--color-surface-strong)',
                border: 'var(--color-border)',
                'border-strong': 'var(--color-border-strong)',
                fg: 'var(--color-fg)',
                'fg-muted': 'var(--color-fg-muted)',
                'fg-subtle': 'var(--color-fg-subtle)',
                accent: 'var(--color-accent)',
                'accent-soft': 'var(--color-accent-soft)',
                'seat-a': 'var(--color-seat-a)',
                'seat-a-soft': 'var(--color-seat-a-soft)',
                'seat-b': 'var(--color-seat-b)',
                'seat-b-soft': 'var(--color-seat-b-soft)',
                system: 'var(--color-system)',
                'system-soft': 'var(--color-system-soft)',
                success: 'var(--color-success)',
                'success-soft': 'var(--color-success-soft)',
                warning: 'var(--color-warning)',
                'warning-soft': 'var(--color-warning-soft)',
                danger: 'var(--color-danger)',
                'danger-soft': 'var(--color-danger-soft)'
            },
            fontFamily: {
                sans: 'var(--font-sans)',
                mono: 'var(--font-mono)'
            },
            fontSize: {
                xs: 'var(--text-xs)',
                sm: 'var(--text-sm)',
                base: 'var(--text-base)',
                md: 'var(--text-md)',
                lg: 'var(--text-lg)',
                xl: 'var(--text-xl)',
                '2xl': 'var(--text-2xl)'
            },
            borderRadius: {
                sm: 'var(--radius-sm)',
                md: 'var(--radius-md)',
                lg: 'var(--radius-lg)',
                xl: 'var(--radius-xl)',
                full: 'var(--radius-full)'
            },
            boxShadow: {
                sm: 'var(--shadow-sm)',
                md: 'var(--shadow-md)',
                lg: 'var(--shadow-lg)',
                focus: 'var(--shadow-focus)'
            }
        }
    },
    plugins: []
};

export default config;
