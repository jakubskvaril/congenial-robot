/**
 * Jediný zdroj pravdy pro barvy. CSS proměnné se z něj injektují za běhu
 * (applyTheme v main.tsx), JS/SVG komponenty (recharts, prstenec) importují
 * hodnoty přímo — přebarvení aplikace = změna na jednom místě.
 */
export const PALETTE = {
  bg:       '#F5F5F3',
  surface:  '#FFFFFF',
  border:   '#E8E8E5',
  border2:  '#D4D4D0',
  text:     '#111110',
  muted:    '#78716C',
  subtle:   '#A8A29E',
  accent:   '#B8922A',
} as const;

/** Stavové barvy — decentní, červená jen u skutečného rizika. */
export const STATUS = {
  good:    '#3F9E5A',
  warn:    '#C99A2E',
  bad:     '#C2410C',
  neutral: '#9A948C',
} as const;

/** Barvy sérií v grafech. */
export const CHART_COLORS = {
  meat:      PALETTE.accent,
  pouch:     STATUS.good,
  felini:    '#1D4ED8',
  other:     PALETTE.subtle,
  reference: STATUS.good,
  actual:    PALETTE.text,
  grid:      PALETTE.border,
} as const;

/** Skóre kapsičky 1–10 → barva. */
export function scoreColor(score: number): string {
  if (score >= 8) return STATUS.good;
  if (score >= 5) return PALETTE.accent;
  return STATUS.bad;
}

/** Zapíše paletu do :root jako CSS proměnné (voláno jednou při startu). */
export function applyTheme(): void {
  const root = document.documentElement.style;
  root.setProperty('--bg', PALETTE.bg);
  root.setProperty('--surface', PALETTE.surface);
  root.setProperty('--border', PALETTE.border);
  root.setProperty('--border-2', PALETTE.border2);
  root.setProperty('--text', PALETTE.text);
  root.setProperty('--muted', PALETTE.muted);
  root.setProperty('--subtle', PALETTE.subtle);
  root.setProperty('--primary', PALETTE.text);
  root.setProperty('--accent', PALETTE.accent);
  root.setProperty('--gold', PALETTE.accent);
  root.setProperty('--green', STATUS.good);
  root.setProperty('--red', STATUS.bad);
  root.setProperty('--orange', STATUS.warn);
}
