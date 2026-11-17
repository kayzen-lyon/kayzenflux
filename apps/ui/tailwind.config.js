/**
 * Jetons de design KAYZEN Flux : orange brûlé, marine profond, crème.
 * Les couleurs sont des variables CSS (index.css) pour basculer clair / sombre sans dupliquer les classes.
 */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        card: v('card'),
        ink: v('ink'),
        body: v('body'),
        hairline: v('hairline'),
        primary: v('primary'),
        'on-primary': v('on-primary'),
        'primary-soft': v('primary-soft'),
        navy: v('navy'),
        rail: v('rail'),
        'rail-ink': v('rail-ink'),
        'rail-muted': v('rail-muted'),
        gold: v('gold'),
        ok: v('ok'),
        danger: v('danger'),
      },
      fontFamily: {
        display: ['"Outfit Variable"', 'Outfit', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans Variable"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Échelle typographique (rapport ≈ 1,25) : 12 · 13 · 15 · 18 · 23 · 29 · 36 · 46
        meta: ['0.75rem', { lineHeight: '1.1rem' }],
        small: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lead: ['1.125rem', { lineHeight: '1.65rem' }],
        h3: ['1.4375rem', { lineHeight: '1.9rem', letterSpacing: '-0.01em' }],
        h2: ['1.8125rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        h1: ['2.25rem', { lineHeight: '2.55rem', letterSpacing: '-0.025em' }],
        hero: ['2.875rem', { lineHeight: '3.05rem', letterSpacing: '-0.035em' }],
      },
      boxShadow: {
        soft: '0 1px 0 rgb(var(--hairline)), 0 1px 2px rgb(var(--shadow) / 0.06)',
        lift: '0 18px 40px -18px rgb(var(--shadow) / 0.45)',
        dock: '0 -12px 32px -16px rgb(var(--shadow) / 0.35)',
      },
      transitionTimingFunction: { out: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
};
