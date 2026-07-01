/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './src/renderer/**/*.{vue,ts,tsx}',
    './index.html'
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f0f',
        'bg-elevated': '#18181b',
        'bg-surface': '#1f1f23',
        'bg-hover': '#27272b',
        'bg-active': '#333338',
        text: '#e4e4e7',
        'text-secondary': '#a1a1aa',
        'text-muted': '#71717a',
        border: '#27272a',
        'border-light': '#3f3f46',
        accent: '#6366f1',
        'accent-hover': '#818cf8',
        'accent-muted': 'rgba(99, 102, 241, 0.12)',
        'accent-glow': 'rgba(99, 102, 241, 0.25)',
        success: '#22c55e',
        'success-muted': 'rgba(34, 197, 94, 0.12)',
        warning: '#f59e0b',
        'warning-muted': 'rgba(245, 158, 11, 0.12)',
        error: '#ef4444',
        'error-muted': 'rgba(239, 68, 68, 0.12)',
        'code-bg': '#1a1a1f'
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Cascadia Code', 'Consolas', 'monospace']
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.5rem' }]
      },
      spacing: {
        sidebar: '260px',
        'chat-max': '768px'
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem'
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
        md: '0 4px 12px rgba(0, 0, 0, 0.4)',
        lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
        glow: '0 0 20px rgba(99, 102, 241, 0.25)'
      },
      transitionDuration: {
        fast: '120ms',
        normal: '200ms',
        slow: '300ms'
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'fade-in-left': 'fade-in-left 200ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'shimmer': 'shimmer 2s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite'
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in-left': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 4px rgba(99, 102, 241, 0.25)' },
          '50%': { boxShadow: '0 0 12px rgba(99, 102, 241, 0.25)' }
        }
      }
    }
  }
}
