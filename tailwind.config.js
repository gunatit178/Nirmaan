/** Tailwind build config. Rebuild the stylesheet with:  npm run build:css  (or see README.md) */
module.exports = {
  // *.html is now Eleventy's generated output (see .eleventy.js) — scanned
  // as a safety net, but src/**/*.njk (the actual source templates) is
  // what's authoritative.
  content: ['./src/**/*.njk', './*.html', './*.js'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0A08',
        surface: '#15130F',
        elevated: '#1D1A15',
        accent: '#C89B5C',
        'accent-light': '#D9B67D',
        primary: '#F3EFE6',
        secondary: '#ADA290',
        muted: '#918468',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
};
