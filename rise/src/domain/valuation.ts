import { dniMezi, dnesIso, nejblizsiPredchozi, posledni, pridejDny, pridejRoky } from './datum';
import type { Aktivum, Cena, Kurzy, Mena, SferaId, Vklad } from './types';
import { xirr, type Cashflow } from './xirr';

/** Proč se ocenění nedá vzít úplně vážně. Prázdné pole = všechno sedí. */
export type OceneniVyhrada =
  | 'bez-ceny' // aktivum nemá žádnou cenu → počítáme nominál
  | 'bez-kurzu' // chybí kurz měny → počítáme nominál
  | 'cena-odhadnuta' // u některé tranše se cena brala z pozdějšího data
  | 'cena-stara'; // poslední cena je starší než 7 dní

export interface OceneniTranse {
  vklad: Vklad;
  /** Kolik jednotek se za tranši pořídilo; null v režimu `sazba`. */
  jednotky: number | null;
  /** Nákupní cena v měně aktiva. */
  cena: number | null;
  /** Kurz měna→CZK k datu nákupu. */
  kurz: number | null;
  /** Dnešní hodnota právě této tranše v CZK. */
  hodnota: number;
  /** Datum, kdy tranše projde tříletým testem; null u penzijního režimu. */
  uzraje: string | null;
  dniDoUzrani: number | null;
}

export interface OceneniAktiva {
  aktivum: Aktivum;
  vlozeno: number;
  poplatky: number;
  hodnota: number;
  jednotky: number | null;
  prumernaNakupniCena: number | null;
  aktualniCena: Cena | null;
  aktualniKurz: number | null;
  zisk: number;
  ziskPct: number | null;
  vynosPa: number | null;
  transe: OceneniTranse[];
  vyhrady: OceneniVyhrada[];
}

export interface OceneniSfery {
  sferaId: SferaId;
  aktiva: OceneniAktiva[];
  vlozeno: number;
  hodnota: number;
  zisk: number;
  ziskPct: number | null;
  vynosPa: number | null;
  vahaPct: number | null;
  vyhrady: OceneniVyhrada[];
}

export interface OceneniPortfolia {
  dnes: string;
  sfery: Record<SferaId, OceneniSfery>;
  poradi: SferaId[];
  vlozeno: number;
  hodnota: number;
  zisk: number;
  ziskPct: number | null;
  vynosPa: number | null;
}

export const SFERY: SferaId[] = ['castle', 'wall', 'horde'];

export const NAZVY_SFER: Record<SferaId, string> = {
  castle: 'Castle',
  wall: 'Walls',
  horde: 'Horde',
};

const CENA_STARA_DNI = 7;

/* ---------------------------------------------------------------- kurzy -- */

/** Kurz měna→CZK k datu. CZK je vždy 1. Bere nejbližší *předchozí* publikovaný. */
export function kurzKDatu(kurzy: Kurzy, mena: Mena, datum: string): number | null {
  if (mena === 'CZK') return 1;
  const rady = Object.entries(kurzy)
    .filter(([, m]) => typeof m?.[mena] === 'number')
    .map(([d, m]) => ({ datum: d, kurz: m[mena] as number }))
    .sort((a, b) => (a.datum < b.datum ? -1 : 1));
  if (rady.length === 0) return null;
  const predchozi = nejblizsiPredchozi(rady, datum);
  // Když je vklad starší než nejstarší známý kurz, vezmeme ten nejstarší —
  // lepší přiblížení než nic, ocenění se označí jako odhad.
  return (predchozi ?? rady[0]!).kurz;
}

function maKurzPred(kurzy: Kurzy, mena: Mena, datum: string): boolean {
  if (mena === 'CZK') return true;
  return Object.entries(kurzy).some(([d, m]) => d <= datum && typeof m?.[mena] === 'number');
}

/* ----------------------------------------------------------------- ceny -- */

/** Cena k datu: nejbližší předchozí, jinak nejstarší známá (pak jde o odhad). */
export function cenaKDatu(ceny: readonly Cena[], datum: string): { cena: number; odhad: boolean } | null {
  if (ceny.length === 0) return null;
  const serazene = [...ceny].sort((a, b) => (a.datum < b.datum ? -1 : 1));
  const predchozi = nejblizsiPredchozi(serazene, datum);
  if (predchozi) return { cena: predchozi.cena, odhad: false };
  return { cena: serazene[0]!.cena, odhad: true };
}

/* ------------------------------------------------------------- ocenění -- */

export function oceniAktivum(
  aktivum: Aktivum,
  kurzy: Kurzy,
  dnes: string = dnesIso(),
): OceneniAktiva {
  const vyhrady = new Set<OceneniVyhrada>();
  const vlozeno = aktivum.vklady.reduce((s, v) => s + v.castka, 0);
  const poplatky = aktivum.vklady.reduce((s, v) => s + (v.poplatek ?? 0), 0);

  const aktualniCena = posledni(aktivum.ceny);
  const aktualniKurz = kurzKDatu(kurzy, aktivum.mena, dnes);

  if (aktualniCena && dniMezi(aktualniCena.datum, dnes) > CENA_STARA_DNI) {
    vyhrady.add('cena-stara');
  }

  const rezimJednotky =
    aktivum.ocenovani === 'jednotky' && aktualniCena != null && aktualniKurz != null;

  if (aktivum.ocenovani === 'jednotky') {
    if (aktualniCena == null) vyhrady.add('bez-ceny');
    else if (aktualniKurz == null) vyhrady.add('bez-kurzu');
  }

  const transe: OceneniTranse[] = [];
  let jednotkyCelkem = 0;
  let nakladyNaJednotky = 0; // v měně aktiva, pro průměrnou nákupní cenu

  for (const vklad of aktivum.vklady) {
    const uzraje =
      aktivum.rezimDane === 'penzijni' ? null : pridejRoky(vklad.datum, 3);
    const spolecne = {
      vklad,
      uzraje,
      dniDoUzrani: uzraje ? Math.max(0, dniMezi(dnes, uzraje)) : null,
    };

    if (!rezimJednotky) {
      transe.push({
        ...spolecne,
        jednotky: null,
        cena: null,
        kurz: null,
        hodnota: hodnotaSazbou(vklad, aktivum.planovanaSazbaPa, dnes),
      });
      continue;
    }

    const kurz = kurzKDatu(kurzy, aktivum.mena, vklad.datum)!;
    if (!maKurzPred(kurzy, aktivum.mena, vklad.datum)) vyhrady.add('cena-odhadnuta');

    let cena = vklad.cenaZaKus ?? null;
    if (cena == null) {
      const nalezena = cenaKDatu(aktivum.ceny, vklad.datum);
      if (nalezena) {
        cena = nalezena.cena;
        if (nalezena.odhad) vyhrady.add('cena-odhadnuta');
      }
    }

    if (cena == null || cena <= 0) {
      // Nemělo by nastat — rezimJednotky garantuje aspoň jednu cenu.
      transe.push({ ...spolecne, jednotky: null, cena: null, kurz, hodnota: vklad.castka });
      continue;
    }

    const investovano = vklad.castka - (vklad.poplatek ?? 0);
    const jednotky = investovano / (cena * kurz);
    jednotkyCelkem += jednotky;
    nakladyNaJednotky += jednotky * cena;

    transe.push({
      ...spolecne,
      jednotky,
      cena,
      kurz,
      hodnota: jednotky * aktualniCena!.cena * aktualniKurz!,
    });
  }

  const hodnota = transe.reduce((s, t) => s + t.hodnota, 0);
  const zisk = hodnota - vlozeno;
  const ziskPct = vlozeno > 0 ? zisk / vlozeno : null;

  return {
    aktivum,
    vlozeno,
    poplatky,
    hodnota,
    jednotky: rezimJednotky ? jednotkyCelkem : null,
    prumernaNakupniCena: jednotkyCelkem > 0 ? nakladyNaJednotky / jednotkyCelkem : null,
    aktualniCena,
    aktualniKurz,
    zisk,
    ziskPct,
    vynosPa: vypoctiXirr(aktivum.vklady, hodnota, dnes),
    transe,
    vyhrady: [...vyhrady],
  };
}

/** hodnota = (castka − poplatek) × (1 + sazba)^((dnes − datum) / 365,25) */
function hodnotaSazbou(vklad: Vklad, sazbaPa: number, dnes: string): number {
  const investovano = vklad.castka - (vklad.poplatek ?? 0);
  const dny = dniMezi(vklad.datum, dnes);
  if (dny <= 0) return investovano;
  return investovano * Math.pow(1 + sazbaPa, dny / 365.25);
}

function vypoctiXirr(vklady: readonly Vklad[], hodnota: number, dnes: string): number | null {
  if (vklady.length === 0) return null;
  const cf: Cashflow[] = vklady.map((v) => ({ datum: v.datum, castka: -v.castka }));
  cf.push({ datum: dnes, castka: hodnota });
  return xirr(cf);
}

/* -------------------------------------------------------------- portfolio -- */

export function oceniPortfolio(
  aktiva: readonly Aktivum[],
  kurzy: Kurzy,
  dnes: string = dnesIso(),
): OceneniPortfolia {
  const ocenena = aktiva.map((a) => oceniAktivum(a, kurzy, dnes));

  const sfery = {} as Record<SferaId, OceneniSfery>;
  for (const sferaId of SFERY) {
    const vlastni = ocenena.filter((o) => o.aktivum.sferaId === sferaId);
    const vlozeno = vlastni.reduce((s, o) => s + o.vlozeno, 0);
    const hodnota = vlastni.reduce((s, o) => s + o.hodnota, 0);
    const zisk = hodnota - vlozeno;
    const vsechnyVklady = vlastni.flatMap((o) => o.aktivum.vklady);
    sfery[sferaId] = {
      sferaId,
      aktiva: vlastni,
      vlozeno,
      hodnota,
      zisk,
      ziskPct: vlozeno > 0 ? zisk / vlozeno : null,
      vynosPa: vypoctiXirr(vsechnyVklady, hodnota, dnes),
      vahaPct: null, // dopočítá se níž, až známe celek
      vyhrady: [...new Set(vlastni.flatMap((o) => o.vyhrady))],
    };
  }

  const vlozeno = ocenena.reduce((s, o) => s + o.vlozeno, 0);
  const hodnota = ocenena.reduce((s, o) => s + o.hodnota, 0);
  const zisk = hodnota - vlozeno;

  for (const sferaId of SFERY) {
    sfery[sferaId].vahaPct = hodnota > 0 ? sfery[sferaId].hodnota / hodnota : null;
  }

  return {
    dnes,
    sfery,
    poradi: SFERY,
    vlozeno,
    hodnota,
    zisk,
    ziskPct: vlozeno > 0 ? zisk / vlozeno : null,
    vynosPa: vypoctiXirr(
      aktiva.flatMap((a) => a.vklady),
      hodnota,
      dnes,
    ),
  };
}

/* -------------------------------------------------------------- sparkline -- */

export interface BodHistorie {
  datum: string;
  hodnota: number;
}

/**
 * Hodnota sféry den po dni zpětně. V režimu `sazba` vyjde hladká křivka,
 * v režimu `jednotky` se propíše skutečný pohyb ceny. Vklady, které tehdy
 * ještě neexistovaly, se nezapočítají — křivka tak nezačíná falešně vysoko.
 */
export function historieHodnoty(
  aktiva: readonly Aktivum[],
  kurzy: Kurzy,
  dnes: string,
  dni = 90,
  krok = 3,
): BodHistorie[] {
  const body: BodHistorie[] = [];
  for (let d = dni; d >= 0; d -= krok) {
    const datum = pridejDny(dnes, -d);
    const hodnota = aktiva.reduce((s, a) => {
      const jenMinule: Aktivum = {
        ...a,
        vklady: a.vklady.filter((v) => v.datum <= datum),
        ceny: a.ceny.filter((c) => c.datum <= datum),
      };
      return s + oceniAktivum(jenMinule, kurzy, datum).hodnota;
    }, 0);
    body.push({ datum, hodnota });
  }
  return body;
}

/* -------------------------------------------------------------- projekce -- */

export interface ProjekcniBod {
  rok: number;
  castle: number;
  wall: number;
  horde: number;
  celkem: number;
}

/** FV = hodnota_dnes × (1 + r)^n. Sazby se berou z aktiv dané sféry. */
export function projekce(
  portfolio: OceneniPortfolia,
  sazby: Record<SferaId, number>,
  roky: readonly number[] = [0, 1, 3, 5, 10],
): ProjekcniBod[] {
  return roky.map((rok) => {
    const bod = { rok, castle: 0, wall: 0, horde: 0, celkem: 0 };
    for (const sferaId of SFERY) {
      const fv = portfolio.sfery[sferaId].hodnota * Math.pow(1 + sazby[sferaId], rok);
      bod[sferaId] = fv;
      bod.celkem += fv;
    }
    return bod;
  });
}

/** Výchozí sazba sféry = vážený průměr plánovaných sazeb jejích aktiv. */
export function vychoziSazby(aktiva: readonly Aktivum[]): Record<SferaId, number> {
  const vychozi: Record<SferaId, number> = { castle: 0.035, wall: 0.0742, horde: 0.1036 };
  for (const sferaId of SFERY) {
    const vlastni = aktiva.filter((a) => a.sferaId === sferaId);
    if (vlastni.length > 0) {
      vychozi[sferaId] = vlastni.reduce((s, a) => s + a.planovanaSazbaPa, 0) / vlastni.length;
    }
  }
  return vychozi;
}
