/**
 * Práce s ISO datem 'YYYY-MM-DD'. Všechno v UTC, aby letní čas neposouval dny.
 */

export function parseDatum(iso: string): number {
  const [r, m, d] = iso.split('-').map(Number);
  return Date.UTC(r ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function dnesIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEN_MS = 86_400_000;

/** Počet celých dní mezi dvěma ISO daty (b − a). */
export function dniMezi(a: string, b: string): number {
  return Math.round((parseDatum(b) - parseDatum(a)) / DEN_MS);
}

export function pridejDny(iso: string, dny: number): string {
  return toIso(parseDatum(iso) + dny * DEN_MS);
}

export function pridejRoky(iso: string, roky: number): string {
  const [r, m, d] = iso.split('-').map(Number);
  const rok = (r ?? 1970) + roky;
  const mesic = (m ?? 1) - 1;
  const den = d ?? 1;
  // 29. února v nepřestupném roce spadne na 1. března — to je záměr,
  // tříletý test se tím neprodlužuje.
  return toIso(Date.UTC(rok, mesic, den));
}

/**
 * Najde v seřazeném poli položku s nejbližším *předchozím* (nebo shodným) datem.
 * ECB nepublikuje o víkendech, proto nikdy „nejbližší jakýkoli".
 */
export function nejblizsiPredchozi<T extends { datum: string }>(
  polozky: readonly T[],
  datum: string,
): T | null {
  let nalezeno: T | null = null;
  for (const p of polozky) {
    if (p.datum <= datum) {
      if (!nalezeno || p.datum > nalezeno.datum) nalezeno = p;
    }
  }
  return nalezeno;
}

/** Poslední položka podle data, bez ohledu na „dnes". */
export function posledni<T extends { datum: string }>(polozky: readonly T[]): T | null {
  let nalezeno: T | null = null;
  for (const p of polozky) {
    if (!nalezeno || p.datum > nalezeno.datum) nalezeno = p;
  }
  return nalezeno;
}
