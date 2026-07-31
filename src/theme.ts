/**
 * Jediný zdroj pravdy pro barvy — design systém "Modernist".
 * CSS proměnné se injektují za běhu (applyTheme v main.tsx), JS/SVG
 * komponenty (recharts, prstenec) importují hodnoty přímo.
 */
export const PALETTE = {
  bg:       '#f3f2f2',
  surface:  '#eae9e9',
  text:     '#201e1d',
  accent:   '#ec3013',
  accent2:  '#e15b47',
  // Tonální škála (OKLCH, jedna společná světlostní osa)
  n100: '#f8f4f4',
  n200: '#eae7e7',
  n300: '#d7d3d3',
  n400: '#bab6b6',
  n500: '#9b9797',
  n600: '#7d7979',
  n700: '#605d5d',
  n800: '#444141',
  n900: '#2d2b2b',
  accent100: '#fff2ef',
  accent600: '#dd2b0f',
  accent700: '#ae1800',
} as const;

/** Stavové barvy — laděné do palety Modernist. */
export const STATUS = {
  good:    '#2f7d4f',
  warn:    '#b8791a',
  bad:     PALETTE.accent,
  neutral: PALETTE.n600,
} as const;

/** Barvy sérií v grafech. */
export const CHART_COLORS = {
  meat:      PALETTE.accent,
  pouch:     STATUS.good,
  felini:    PALETTE.n700,
  other:     PALETTE.n400,
  reference: STATUS.good,
  actual:    PALETTE.text,
  grid:      PALETTE.n300,
} as const;

/** Skóre kapsičky 1–10 → barva. */
export function scoreColor(score: number): string {
  if (score >= 8) return STATUS.good;
  if (score >= 5) return STATUS.warn;
  return STATUS.bad;
}

/** Zapíše paletu do :root jako CSS proměnné (voláno jednou při startu). */
export function applyTheme(): void {
  const r = document.documentElement.style;
  r.setProperty('--bg', PALETTE.bg);
  r.setProperty('--surface', PALETTE.surface);
  r.setProperty('--text', PALETTE.text);
  r.setProperty('--primary', PALETTE.text);
  r.setProperty('--accent', PALETTE.accent);
  r.setProperty('--gold', PALETTE.accent);
  r.setProperty('--muted', PALETTE.n700);
  r.setProperty('--subtle', PALETTE.n600);
  r.setProperty('--border', PALETTE.n300);
  r.setProperty('--border-2', PALETTE.n400);
  r.setProperty('--green', STATUS.good);
  r.setProperty('--orange', STATUS.warn);
  r.setProperty('--red', STATUS.bad);
  for (const [k, v] of Object.entries(PALETTE)) {
    if (/^(n|accent)\d/.test(k)) r.setProperty(`--${k}`, v);
  }
}
