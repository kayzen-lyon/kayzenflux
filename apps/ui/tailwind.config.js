/** Jetons de design issus de la maquette Stitch « Kayzen » (clair) et « Kayzen Dark ». */
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
        'primary-soft': v('primary-soft'),
        navy: v('navy'),
        gold: v('gold'),
        ok: v('ok'),
        danger: v('danger'),
      },
      fontFamily: {
        display: ['"Outfit Variable"', 'Outfit', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans Variable"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: { soft: '0 1px 8px rgba(0,0,0,0.05)', lift: '0 12px 32px -12px rgba(19,41,68,0.35)' },
    },
  },
  plugins: [],
};
