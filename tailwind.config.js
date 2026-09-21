/** Tailwind build config. Rebuild the stylesheet with:  npm run build:css  (or see README.md) */
module.exports = {
  content: ['./*.html', './*.js'],
  theme: {
    extend: {
      colors: {
        bg: '#080C14',
        surface: '#0D1117',
        elevated: '#111827',
        accent: '#6366f1',
        'accent-light': '#818cf8',
        primary: '#F8FAFC',
        secondary: '#94A3B8',
        muted: '#475569',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'sans-serif'],
      },
    },
  },
};
