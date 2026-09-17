/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary':     'rgb(var(--bg-primary) / <alpha-value>)',
        'bg-card':        'rgb(var(--bg-card) / <alpha-value>)',
        'bg-elevated':    'rgb(var(--bg-elevated) / <alpha-value>)',
        'text-primary':   'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'text-muted':     'rgb(var(--text-muted) / <alpha-value>)',
        'gold':           'rgb(var(--gold) / <alpha-value>)',
        'gold-light':     'rgb(var(--gold-light) / <alpha-value>)',
        'gold-dim':       'rgb(var(--gold) / 0.18)',
        'border-subtle':  'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'success':        'rgb(var(--success) / <alpha-value>)',
        'success-light':  'rgb(var(--success-light) / <alpha-value>)',
        'warning':        'rgb(var(--warning) / <alpha-value>)',
        'danger':         'rgb(var(--danger) / <alpha-value>)',
        'error':          'rgb(var(--error) / <alpha-value>)',
        'ai-color':       'rgb(var(--ai-color) / <alpha-value>)',
        'accent-text':    'rgb(var(--accent-text))',
        'border-dim':     'var(--border-dim)',
      },
      fontFamily: {
        'cormorant': ['Fraunces', 'serif'],
        'dm-sans':   ['Geist', 'sans-serif'],
        'dm-mono':   ['Geist Mono', 'monospace'],
      },
      fontSize: {
        'display': ['3.5rem', { lineHeight: '1.1', fontWeight: '300' }],
        'h1':      ['2.25rem', { lineHeight: '1.2', fontWeight: '300' }],
        'h2':      ['1.75rem', { lineHeight: '1.3', fontWeight: '300' }],
        'h3':      ['1.25rem', { lineHeight: '1.4', fontWeight: '400' }],
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-up':   'slideUp 0.3s ease forwards',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'skeleton':   'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseGold: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        skeleton:  { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
    },
  },
  plugins: [],
};
