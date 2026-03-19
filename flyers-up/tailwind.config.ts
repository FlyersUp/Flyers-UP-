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
        bgBase: 'hsl(var(--bg) / <alpha-value>)',
        bg: 'hsl(var(--bg) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        surface2: 'hsl(var(--surface-2) / <alpha-value>)',
        hover: 'hsl(var(--hover) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        borderStrong: 'hsl(var(--border-2) / <alpha-value>)',
        text: 'hsl(var(--text) / <alpha-value>)',
        text2: 'hsl(var(--text-2) / <alpha-value>)',
        text3: 'hsl(var(--text-3) / <alpha-value>)',
        muted: 'hsl(var(--text-muted) / <alpha-value>)',
        accent: 'hsl(var(--accent) / <alpha-value>)',
        accentContrast: 'hsl(var(--accent-contrast) / <alpha-value>)',
        accentGreen: 'hsl(var(--accent-customer) / <alpha-value>)',
        accentOrange: 'hsl(var(--accent-pro) / <alpha-value>)',
        selectedGreen: 'hsl(var(--selected-green))',
        selectedOrange: 'hsl(var(--selected-orange))',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        success: 'hsl(var(--success) / <alpha-value>)',
        warning: 'hsl(var(--warning) / <alpha-value>)',
        info: 'hsl(var(--info) / <alpha-value>)',
        danger: 'hsl(var(--danger) / <alpha-value>)',
        hairline: 'var(--hairline)',
        nav: 'var(--nav-bg)',
        badgeFill: 'var(--badge-bg)',
        badgeBorder: 'var(--badge-border)',
        /* Accent density: soft tint and border from --role-accent (used in focus mode) */
        roleTint: 'var(--role-tint)',
        roleBorder: 'var(--role-border)',
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

