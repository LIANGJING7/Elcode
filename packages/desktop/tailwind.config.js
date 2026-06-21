/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './src/renderer/**/*.{vue,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: '#1a1a1a',
        'bg-secondary': '#262626',
        'bg-tertiary': '#404040',
        text: '#a0a0a0',
        'text-muted': '#666666',
        border: '#333333',
        accent: '#3b82f6',
        'accent-hover': '#2563eb',
        'code-bg': '#2d2d2d'
      },
      fontFamily: {
        sans: ['Noto Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace']
      },
      fontSize: {
        body: ['0.875rem', { lineHeight: '1.5' }],
        small: ['0.75rem', { lineHeight: '1.25' }]
      },
      spacing: {
        sidebar: '240px'
      },
      transitionDuration: {
        fast: '150ms'
      }
    }
  }
}