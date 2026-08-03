/**
 * Money and formatting. Rounding happens here and nowhere else — never
 * inside a calculation.
 *
 * The realm's ledger is kept in CZK because that is the currency the
 * positions are funded in; the interface language is English.
 */

const LOCALE = 'en-US';

const cele = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const desetinne = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

/** „80,000 CZK" — unit after the number. */
export function formatKc(hodnota: number | null | undefined): string {
  if (hodnota == null || !Number.isFinite(hodnota)) return '—';
  return `${cele.format(Math.round(hodnota))} CZK`;
}

/** Bare number, whole crowns. */
export function formatCislo(hodnota: number | null | undefined): string {
  if (hodnota == null || !Number.isFinite(hodnota)) return '—';
  return cele.format(Math.round(hodnota));
}

/** Signed: „+4,200 CZK" / „−1,100 CZK" (typographic minus). */
export function formatKcSeZnamenkem(hodnota: number | null | undefined): string {
  if (hodnota == null || !Number.isFinite(hodnota)) return '—';
  const zaokrouhleno = Math.round(hodnota);
  if (zaokrouhleno === 0) return '0 CZK';
  const znak = zaokrouhleno > 0 ? '+' : '−';
  return `${znak}${cele.format(Math.abs(zaokrouhleno))} CZK`;
}

/** 0.0742 → „7.4%". */
export function formatProcenta(podil: number | null | undefined, desetinnaMista = 1): string {
  if (podil == null || !Number.isFinite(podil)) return '—';
  const n = new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: desetinnaMista,
    minimumFractionDigits: desetinnaMista,
  });
  return `${n.format(podil * 100)}%`;
}

/** 0.0742 → „+7.4%", −0.02 → „−2.0%". */
export function formatProcentaSeZnamenkem(
  podil: number | null | undefined,
  desetinnaMista = 1,
): string {
  if (podil == null || !Number.isFinite(podil)) return '—';
  const n = new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: desetinnaMista,
    minimumFractionDigits: desetinnaMista,
  });
  const hodnota = podil * 100;
  if (Math.abs(hodnota) < 0.05) return '0.0%';
  const znak = hodnota > 0 ? '+' : '−';
  return `${znak}${n.format(Math.abs(hodnota))}%`;
}

/** Price in the asset's own currency, two decimals. */
export function formatCenu(cena: number | null | undefined, mena: string): string {
  if (cena == null || !Number.isFinite(cena)) return '—';
  return `${desetinne.format(cena)} ${mena}`;
}

/** Unit count — four decimals, ETFs are bought in fractions. */
export function formatJednotky(jednotky: number | null | undefined): string {
  if (jednotky == null || !Number.isFinite(jednotky)) return '—';
  return new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  }).format(jednotky);
}

/** English plural after a numeral: 1 tranche, 2 tranches. */
export function plural(pocet: number, jednotne: string, mnozne: string): string {
  return Math.abs(Math.round(pocet)) === 1 ? jednotne : mnozne;
}

/** „1 day" / „519 days" — the number itself stays in monospace. */
export function formatDny(pocet: number): string {
  const n = Math.round(pocet);
  return `${n} ${plural(n, 'day', 'days')}`;
}

const MESICE = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MESICE_KRATCE = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** '2026-07-31' → '31 Jul 2026'. Unambiguous in every English variant. */
export function formatDatum(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [r, m, d] = iso.split('-');
  if (!r || !m || !d) return iso;
  const mesic = MESICE_KRATCE[Number(m) - 1] ?? m;
  return `${Number(d)} ${mesic} ${r}`;
}

/** 1 → '1st', 2 → '2nd', 13 → '13th', 21 → '21st'. */
export function radova(n: number): string {
  const desitky = n % 100;
  if (desitky >= 11 && desitky <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** '2026-07-31' → 'In the year of our Lord 2026, on the 31st day of July'. */
export function formatLetopis(iso: string): string {
  const [r, m, d] = iso.split('-');
  if (!r || !m || !d) return iso;
  const mesic = MESICE[Number(m) - 1] ?? '';
  return `In the year of our Lord ${r}, on the ${radova(Number(d))} day of ${mesic}`;
}
