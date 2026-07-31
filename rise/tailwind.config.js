/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pergamen: 'var(--pergamen)',
        'pergamen-stin': 'var(--pergamen-stin)',
        inkoust: 'var(--inkoust)',
        kamen: 'var(--kamen)',
        zlato: 'var(--zlato)',
        rumelka: 'var(--rumelka)',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        text: ['"EB Garamond"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
