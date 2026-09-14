/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        'surface-elevated': 'var(--bg-surface-elevated)',
        'surface-lowest': 'var(--bg-surface-lowest)',
        border: 'var(--border-color)',
        'border-subtle': 'var(--border-subtle)',
        primary: {
          DEFAULT: 'var(--text-primary)',
        },
        secondary: {
          DEFAULT: 'var(--text-secondary)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          'primary-solid': 'var(--accent-primary-solid)',
          'primary-container': 'var(--accent-primary-container)',
          'on-primary': 'var(--on-primary)',
          secondary: 'var(--accent-secondary)',
          'secondary-container': 'var(--accent-secondary-container)',
          'on-secondary': 'var(--on-secondary)',
          tertiary: 'var(--accent-tertiary)',
          'tertiary-container': 'var(--accent-tertiary-container)',
          'on-tertiary': 'var(--on-tertiary)',
          error: 'var(--accent-error)',
          'error-container': 'var(--accent-error-container)',
          'on-error': 'var(--on-error)',
        },
      },
      fontFamily: {
        sans: [
          'system-ui', '-apple-system', 'BlinkMacSystemFont',
          '"Segoe UI"', 'Roboto', 'sans-serif',
        ],
        mono: [
          'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco',
          'Consolas', 'monospace',
        ],
      },
      fontSize: {
        'display-hero': ['3rem', { lineHeight: '3.5rem', fontWeight: '800', letterSpacing: '-0.025em' }],
        'headline-lg': ['2rem', { lineHeight: '2.5rem', fontWeight: '700', letterSpacing: '-0.02em' }],
        'headline-md': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'body-md': ['1rem', { lineHeight: '1.5rem' }],
        'code-mono': ['0.875rem', { lineHeight: '1.375rem' }],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        full: '9999px',
      },
      spacing: {
        'touch-min': '3rem',
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
      },
      maxWidth: {
        reading: '52rem',
        shell: '80rem',
      },
    },
  },
  plugins: [],
};
