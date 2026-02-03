import type { Config } from 'tailwindcss';

const config: Config = {
  // Tailwind v4 types require the selector when using the class strategy.
  // We still use the `.dark` class on the root element.
  darkMode: ['class', '.dark'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './types/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(var(--bg) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        surface2: 'hsl(var(--surface-2) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        text: 'hsl(var(--text) / <alpha-value>)',
        muted: 'hsl(var(--text-muted) / <alpha-value>)',
        accent: 'hsl(var(--accent) / <alpha-value>)',
        accentContrast: 'hsl(var(--accent-contrast) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        success: 'hsl(var(--success) / <alpha-value>)',
        warning: 'hsl(var(--warning) / <alpha-value>)',
        info: 'hsl(var(--info) / <alpha-value>)',
        danger: 'hsl(var(--danger) / <alpha-value>)',
        hairline: 'var(--hairline)',
        nav: 'var(--nav-bg)',
        badgeFill: 'var(--badge-bg)',
        badgeBorder: 'var(--badge-border)',
      },
      boxShadow: {
        sm: 'var(--shadow-1)',
        md: 'var(--shadow-2)',
        card: 'var(--shadow-card)',
      },
    },
  },
};

export default config;

