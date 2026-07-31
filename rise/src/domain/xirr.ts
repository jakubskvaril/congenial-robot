import { parseDatum } from './datum';

export interface Cashflow {
  datum: string; // ISO
  castka: number; // záporné = vklad, kladné = výběr / aktuální hodnota
}

const DEN_MS = 86_400_000;
const TOLERANCE = 1e-7;
const MAX_ITERACI = 100;
const ODHAD = 0.1;
const DOLNI_MEZ = -0.999;
const HORNI_MEZ = 10;

interface Bod {
  roky: number;
  castka: number;
}

function npv(body: readonly Bod[], r: number): number {
  let suma = 0;
  for (const b of body) suma += b.castka / Math.pow(1 + r, b.roky);
  return suma;
}

function derivaceNpv(body: readonly Bod[], r: number): number {
  let suma = 0;
  for (const b of body) {
    if (b.roky === 0) continue;
    suma += (-b.roky * b.castka) / Math.pow(1 + r, b.roky + 1);
  }
  return suma;
}

/**
 * Vnitřní výnosové procento nad nepravidelnými cashflow.
 *
 *   NPV(r) = Σ CF_i / (1 + r)^((d_i − d_0) / 365)
 *
 * Newton-Raphson od odhadu 0,10; při divergenci bisekce v ⟨−0,999; 10⟩.
 * Vrací null, když je méně než dva cashflow nebo mají všechny stejné znaménko.
 */
export function xirr(cashflow: readonly Cashflow[]): number | null {
  const platne = cashflow.filter((cf) => Number.isFinite(cf.castka) && cf.castka !== 0);
  if (platne.length < 2) return null;

  const maKladny = platne.some((cf) => cf.castka > 0);
  const maZaporny = platne.some((cf) => cf.castka < 0);
  if (!maKladny || !maZaporny) return null;

  const serazene = [...platne].sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
  const d0 = parseDatum(serazene[0]!.datum);
  const body: Bod[] = serazene.map((cf) => ({
    roky: (parseDatum(cf.datum) - d0) / DEN_MS / 365,
    castka: cf.castka,
  }));

  // Všechno ve stejný den → výnos nedává smysl.
  if (body.every((b) => b.roky === 0)) return null;

  const newton = newtonRaphson(body);
  if (newton != null) return newton;
  return bisekce(body);
}

function newtonRaphson(body: readonly Bod[]): number | null {
  let r = ODHAD;
  for (let i = 0; i < MAX_ITERACI; i++) {
    if (r <= DOLNI_MEZ) return null;
    const f = npv(body, r);
    if (!Number.isFinite(f)) return null;
    if (Math.abs(f) < TOLERANCE) return r;
    const df = derivaceNpv(body, r);
    if (!Number.isFinite(df) || Math.abs(df) < 1e-12) return null;
    const dalsi = r - f / df;
    if (!Number.isFinite(dalsi)) return null;
    if (Math.abs(dalsi - r) < TOLERANCE) return dalsi > DOLNI_MEZ ? dalsi : null;
    r = dalsi;
  }
  return null;
}

function bisekce(body: readonly Bod[]): number | null {
  let lo = DOLNI_MEZ;
  let hi = HORNI_MEZ;
  let fLo = npv(body, lo);
  let fHi = npv(body, hi);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi)) return null;
  if (fLo * fHi > 0) return null; // kořen v intervalu není

  for (let i = 0; i < 200; i++) {
    const stred = (lo + hi) / 2;
    const fStred = npv(body, stred);
    if (!Number.isFinite(fStred)) return null;
    if (Math.abs(fStred) < TOLERANCE || hi - lo < TOLERANCE) return stred;
    if (fLo * fStred <= 0) {
      hi = stred;
      fHi = fStred;
    } else {
      lo = stred;
      fLo = fStred;
    }
  }
  void fHi;
  return (lo + hi) / 2;
}
