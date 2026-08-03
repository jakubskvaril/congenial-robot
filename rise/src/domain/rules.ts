import { dniMezi, dnesIso } from './datum';
import { formatDatum, formatDny, formatKc, formatProcenta, plural } from './money';
import type { Aktivum, Prahy } from './types';
import type { OceneniPortfolia } from './valuation';

export type StavZakona = 'ok' | 'varovani' | 'poruseno' | 'neurceno';

export interface Zakon {
  id: string;
  nazev: string;
  stav: StavZakona;
  /** Short figure shown on the right of the row. */
  hodnota: string;
  /** Supporting sentence under the title. */
  detail: string;
  /** 0–1 for the fill bar; null when it cannot be expressed. */
  postup: number | null;
}

export const VYCHOZI_PRAHY: Prahy = {
  hordaStropVkladu: 45_000,
  itExpoziceMax: 0.4,
  itPodilVeWall: 0.25,
  hradbyMesicniTranse: 26_700,
  hradbyPocetTransi: 6,
};

/**
 * The Laws of the Realm are the user's own rules. The app only displays and
 * checks them — it never invents a recommendation of its own.
 */
export function vyhodnotZakony(
  portfolio: OceneniPortfolia,
  aktiva: readonly Aktivum[],
  prahy: Prahy,
  dnes: string = dnesIso(),
): Zakon[] {
  return [
    zakonHradby(portfolio, prahy),
    zakonStropHordy(portfolio, prahy),
    zakonItExpozice(portfolio, prahy),
    zakonAkumulacni(aktiva),
    zakonCasovyTest(aktiva, dnes),
  ];
}

function zakonHradby(portfolio: OceneniPortfolia, prahy: Prahy): Zakon {
  const cil = prahy.hradbyMesicniTranse * prahy.hradbyPocetTransi;
  const vlozeno = portfolio.sfery.wall.vlozeno;
  const hotovoTransi = Math.min(
    prahy.hradbyPocetTransi,
    Math.floor(vlozeno / prahy.hradbyMesicniTranse),
  );
  const zbyva = Math.max(0, prahy.hradbyPocetTransi - hotovoTransi);
  return {
    id: 'hradby-plan',
    nazev: `The Walls are funded with ${formatKc(prahy.hradbyMesicniTranse)} a month for ${prahy.hradbyPocetTransi} months`,
    stav: zbyva === 0 ? 'ok' : 'neurceno',
    hodnota: zbyva === 0 ? 'complete' : `${zbyva} ${plural(zbyva, 'tranche', 'tranches')} left`,
    detail: `${formatKc(vlozeno)} of ${formatKc(cil)} paid in.`,
    postup: cil > 0 ? Math.min(1, vlozeno / cil) : null,
  };
}

function zakonStropHordy(portfolio: OceneniPortfolia, prahy: Prahy): Zakon {
  // Deliberately measured on contributions, not on value — the cap is on
  // what you send to the Horde, not on what it grows into.
  const vlozeno = portfolio.sfery.horde.vlozeno;
  const strop = prahy.hordaStropVkladu;
  const podil = strop > 0 ? vlozeno / strop : 0;
  const stav: StavZakona = vlozeno > strop ? 'poruseno' : podil >= 0.9 ? 'varovani' : 'ok';
  return {
    id: 'horda-strop',
    nazev: `Horde contributions are capped at ${formatKc(strop)}`,
    stav,
    hodnota: `${formatKc(vlozeno)} / ${formatKc(strop)}`,
    detail:
      stav === 'poruseno'
        ? `Cap exceeded by ${formatKc(vlozeno - strop)}.`
        : stav === 'varovani'
          ? `${formatKc(strop - vlozeno)} left before the cap.`
          : 'Measured on contributions, not on value.',
    postup: Math.min(1, podil),
  };
}

function zakonItExpozice(portfolio: OceneniPortfolia, prahy: Prahy): Zakon {
  const hodnota = portfolio.hodnota;
  const it = portfolio.sfery.wall.hodnota * prahy.itPodilVeWall + portfolio.sfery.horde.hodnota;
  const podil = hodnota > 0 ? it / hodnota : null;
  const stav: StavZakona =
    podil == null ? 'neurceno' : podil > prahy.itExpoziceMax ? 'poruseno' : 'ok';
  const odhad = `Estimate: ${formatProcenta(prahy.itPodilVeWall, 0)} of the Walls plus the whole Horde.`;
  return {
    id: 'it-expozice',
    nazev: `Total IT exposure at or below ${formatProcenta(prahy.itExpoziceMax, 0)}`,
    stav,
    hodnota: podil == null ? '—' : formatProcenta(podil),
    detail:
      stav === 'poruseno' ? `The law says: new money goes to the Walls only. ${odhad}` : odhad,
    postup: podil == null ? null : Math.min(1, podil / prahy.itExpoziceMax),
  };
}

function zakonAkumulacni(aktiva: readonly Aktivum[]): Zakon {
  const sledovana = aktiva.filter((a) => a.ocenovani === 'jednotky');
  const neakumulacni = sledovana.filter((a) => a.akumulacni === false);
  const nezname = sledovana.filter((a) => a.akumulacni == null);
  const stav: StavZakona =
    neakumulacni.length > 0 ? 'poruseno' : nezname.length > 0 ? 'neurceno' : 'ok';
  return {
    id: 'akumulacni',
    nazev: 'Accumulating share classes only',
    stav,
    hodnota:
      sledovana.length === 0
        ? '—'
        : `${sledovana.length - neakumulacni.length - nezname.length} / ${sledovana.length}`,
    detail:
      neakumulacni.length > 0
        ? `Distributing class: ${neakumulacni.map((a) => a.nazev).join(', ')}.`
        : nezname.length > 0
          ? `Not confirmed for: ${nezname.map((a) => a.nazev).join(', ')}.`
          : 'Every tracked asset is accumulating.',
    postup: null,
  };
}

function zakonCasovyTest(aktiva: readonly Aktivum[], dnes: string): Zakon {
  const transe = aktiva
    .filter((a) => a.rezimDane !== 'penzijni')
    .flatMap((a) => a.vklady.map((v) => ({ nazev: a.nazev, vklad: v })));

  if (transe.length === 0) {
    return {
      id: 'casovy-test',
      nazev: 'Three-year holding test, per tranche',
      stav: 'neurceno',
      hodnota: '—',
      detail: 'No tranche is running the test yet.',
      postup: null,
    };
  }

  const uzrani = transe
    .map((t) => ({ ...t, datum: pridejTriRoky(t.vklad.datum) }))
    .sort((a, b) => (a.datum < b.datum ? -1 : 1));

  const nejblizsi = uzrani.find((u) => u.datum > dnes) ?? uzrani[uzrani.length - 1]!;
  const uzralo = uzrani.filter((u) => u.datum <= dnes).length;
  const dni = dniMezi(dnes, nejblizsi.datum);

  return {
    id: 'casovy-test',
    nazev: 'Three-year holding test, per tranche',
    stav: 'neurceno',
    hodnota: dni > 0 ? formatDatum(nejblizsi.datum) : 'all matured',
    detail:
      dni > 0
        ? `Next maturity in ${formatDny(dni)} (${nejblizsi.nazev}). ${uzralo} of ${uzrani.length} ${plural(uzrani.length, 'tranche', 'tranches')} matured.`
        : `All ${uzrani.length} ${plural(uzrani.length, 'tranche', 'tranches')} have matured.`,
    postup: null,
  };
}

function pridejTriRoky(iso: string): string {
  const [r, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC((r ?? 1970) + 3, (m ?? 1) - 1, d ?? 1)).toISOString().slice(0, 10);
}
