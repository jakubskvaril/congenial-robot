/**
 * Peníze a formátování. Zaokrouhluje se až tady — nikdy uvnitř výpočtu.
 */

const czk = new Intl.NumberFormat('cs-CZ', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const czkDesetinne = new Intl.NumberFormat('cs-CZ', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

/** „80 000 Kč“ — mezera jako oddělovač tisíců, jednotka za číslem. */
export function formatKc(hodnota: number | null | undefined): string {
  if (hodnota == null || !Number.isFinite(hodnota)) return '—';
  return `${czk.format(Math.round(hodnota))} Kč`;
}

/** Číslo bez jednotky, celé koruny. */
export function formatCislo(hodnota: number | null | undefined): string {
  if (hodnota == null || !Number.isFinite(hodnota)) return '—';
  return czk.format(Math.round(hodnota));
}

/** Se znaménkem: „+4 200 Kč“ / „−1 100 Kč“ (typografický minus). */
export function formatKcSeZnamenkem(hodnota: number | null | undefined): string {
  if (hodnota == null || !Number.isFinite(hodnota)) return '—';
  const zaokrouhleno = Math.round(hodnota);
  if (zaokrouhleno === 0) return '0 Kč';
  const znak = zaokrouhleno > 0 ? '+' : '−';
  return `${znak}${czk.format(Math.abs(zaokrouhleno))} Kč`;
}

/** 0.0742 → „7,4 %“. */
export function formatProcenta(podil: number | null | undefined, desetinnaMista = 1): string {
  if (podil == null || !Number.isFinite(podil)) return '—';
  const n = new Intl.NumberFormat('cs-CZ', {
    maximumFractionDigits: desetinnaMista,
    minimumFractionDigits: desetinnaMista,
  });
  return `${n.format(podil * 100)} %`;
}

/** 0.0742 → „+7,4 %“, −0.02 → „−2,0 %“. */
export function formatProcentaSeZnamenkem(
  podil: number | null | undefined,
  desetinnaMista = 1,
): string {
  if (podil == null || !Number.isFinite(podil)) return '—';
  const n = new Intl.NumberFormat('cs-CZ', {
    maximumFractionDigits: desetinnaMista,
    minimumFractionDigits: desetinnaMista,
  });
  const hodnota = podil * 100;
  if (Math.abs(hodnota) < 0.05) return `0,0 %`;
  const znak = hodnota > 0 ? '+' : '−';
  return `${znak}${n.format(Math.abs(hodnota))} %`;
}

/** Cena v měně aktiva, dvě desetinná místa. */
export function formatCenu(cena: number | null | undefined, mena: string): string {
  if (cena == null || !Number.isFinite(cena)) return '—';
  return `${czkDesetinne.format(cena)} ${mena}`;
}

/** Počet jednotek — čtyři desetinná místa, ETF se kupují po zlomcích. */
export function formatJednotky(jednotky: number | null | undefined): string {
  if (jednotky == null || !Number.isFinite(jednotky)) return '—';
  return new Intl.NumberFormat('cs-CZ', {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  }).format(jednotky);
}

/** '2026-07-31' → '31. 7. 2026'. */
export function formatDatum(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [r, m, d] = iso.split('-');
  if (!r || !m || !d) return iso;
  return `${Number(d)}. ${Number(m)}. ${r}`;
}

/**
 * České skloňování po číslovce: 1 tranše, 2–4 tranše, 5+ tranší.
 * Sloveso se řídí stejně — „zbývá 1 tranše" / „zbývají 3 tranše" / „zbývá 5 tranší".
 */
export function sklonuj(
  pocet: number,
  jedna: string,
  dveAzCtyri: string,
  petAVic: string,
): string {
  const n = Math.abs(Math.round(pocet));
  if (n === 1) return jedna;
  if (n >= 2 && n <= 4) return dveAzCtyri;
  return petAVic;
}

/** „1 den" / „3 dny" / „519 dní" — číslo zůstává v monospace. */
export function formatDny(pocet: number): string {
  return `${Math.round(pocet)} ${sklonuj(pocet, 'den', 'dny', 'dní')}`;
}

const MESICE = [
  'ledna',
  'února',
  'března',
  'dubna',
  'května',
  'června',
  'července',
  'srpna',
  'září',
  'října',
  'listopadu',
  'prosince',
];

/** '2026-07-31' → 'Léta Páně 2026, 31. dne července'. */
export function formatLetopis(iso: string): string {
  const [r, m, d] = iso.split('-');
  if (!r || !m || !d) return iso;
  const mesic = MESICE[Number(m) - 1] ?? '';
  return `Léta Páně ${r}, ${Number(d)}. dne ${mesic}`;
}
