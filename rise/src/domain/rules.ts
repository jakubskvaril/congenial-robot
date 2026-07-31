import { dniMezi, dnesIso } from './datum';
import { formatDatum, formatDny, formatKc, formatProcenta, sklonuj } from './money';
import type { Aktivum, Prahy } from './types';
import type { OceneniPortfolia } from './valuation';

export type StavZakona = 'ok' | 'varovani' | 'poruseno' | 'neurceno';

export interface Zakon {
  id: string;
  nazev: string;
  stav: StavZakona;
  /** Krátký údaj vpravo v tabulce. */
  hodnota: string;
  /** Doplňující věta pod názvem. */
  detail: string;
  /** 0–1 pro pruh naplnění; null když se nedá vyjádřit. */
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
 * Zákony říše si uživatel stanovil sám. Aplikace je jen zobrazuje a hlídá —
 * žádné vlastní doporučení tu nevzniká.
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
    nazev: `Hradby se plní po ${formatKc(prahy.hradbyMesicniTranse)} měsíčně po dobu ${prahy.hradbyPocetTransi} měsíců`,
    stav: zbyva === 0 ? 'ok' : 'neurceno',
    hodnota:
      zbyva === 0
        ? 'naplněno'
        : `${sklonuj(zbyva, 'zbývá', 'zbývají', 'zbývá')} ${zbyva} ${sklonuj(zbyva, 'tranše', 'tranše', 'tranší')}`,
    detail: `Vloženo ${formatKc(vlozeno)} z ${formatKc(cil)}.`,
    postup: cil > 0 ? Math.min(1, vlozeno / cil) : null,
  };
}

function zakonStropHordy(portfolio: OceneniPortfolia, prahy: Prahy): Zakon {
  // Záměrně z vkladů, ne z hodnoty — strop je na to, co do Hordy pošleš.
  const vlozeno = portfolio.sfery.horde.vlozeno;
  const strop = prahy.hordaStropVkladu;
  const podil = strop > 0 ? vlozeno / strop : 0;
  const stav: StavZakona = vlozeno > strop ? 'poruseno' : podil >= 0.9 ? 'varovani' : 'ok';
  return {
    id: 'horda-strop',
    nazev: `Horda má strop vkladů ${formatKc(strop)}`,
    stav,
    hodnota: `${formatKc(vlozeno)} / ${formatKc(strop)}`,
    detail:
      stav === 'poruseno'
        ? `Strop překročen o ${formatKc(vlozeno - strop)}.`
        : stav === 'varovani'
          ? `Do stropu zbývá ${formatKc(strop - vlozeno)}.`
          : 'Počítá se z vkladů, ne z hodnoty.',
    postup: Math.min(1, podil),
  };
}

function zakonItExpozice(portfolio: OceneniPortfolia, prahy: Prahy): Zakon {
  const hodnota = portfolio.hodnota;
  const it = portfolio.sfery.wall.hodnota * prahy.itPodilVeWall + portfolio.sfery.horde.hodnota;
  const podil = hodnota > 0 ? it / hodnota : null;
  const stav: StavZakona =
    podil == null ? 'neurceno' : podil > prahy.itExpoziceMax ? 'poruseno' : 'ok';
  return {
    id: 'it-expozice',
    nazev: `Celková IT expozice ≤ ${formatProcenta(prahy.itExpoziceMax, 0)}`,
    stav,
    hodnota: podil == null ? '—' : formatProcenta(podil),
    detail:
      stav === 'poruseno'
        ? `Zákon říká: nové peníze jen do Hradeb. Odhad ${formatProcenta(prahy.itPodilVeWall, 0)} z Hradeb + celá Horda.`
        : `Odhad: ${formatProcenta(prahy.itPodilVeWall, 0)} z Hradeb + celá Horda.`,
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
    nazev: 'Nakupovat jen akumulační třídy',
    stav,
    hodnota:
      sledovana.length === 0
        ? '—'
        : `${sledovana.length - neakumulacni.length - nezname.length} / ${sledovana.length}`,
    detail:
      neakumulacni.length > 0
        ? `Distribuční třída: ${neakumulacni.map((a) => a.nazev).join(', ')}.`
        : nezname.length > 0
          ? `Nezaškrtnuto u: ${nezname.map((a) => a.nazev).join(', ')}.`
          : 'Všechna sledovaná aktiva jsou akumulační.',
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
      nazev: 'Tříletý časový test per tranše',
      stav: 'neurceno',
      hodnota: '—',
      detail: 'Zatím žádná tranše, u které by test běžel.',
      postup: null,
    };
  }

  const uzrani = transe
    .map((t) => ({
      ...t,
      datum: pridejTriRoky(t.vklad.datum),
    }))
    .sort((a, b) => (a.datum < b.datum ? -1 : 1));

  const nejblizsi = uzrani.find((u) => u.datum > dnes) ?? uzrani[uzrani.length - 1]!;
  const uzralo = uzrani.filter((u) => u.datum <= dnes).length;
  const dni = dniMezi(dnes, nejblizsi.datum);

  return {
    id: 'casovy-test',
    nazev: 'Tříletý časový test per tranše',
    stav: 'neurceno',
    hodnota: dni > 0 ? formatDatum(nejblizsi.datum) : 'vše uzrálo',
    detail:
      dni > 0
        ? `Nejbližší uzrání za ${formatDny(dni)} (${nejblizsi.nazev}). Uzrálo ${uzralo} z ${uzrani.length} ${sklonuj(uzrani.length, 'tranše', 'tranší', 'tranší')}.`
        : `Uzrálo všech ${uzrani.length} ${sklonuj(uzrani.length, 'tranše', 'tranše', 'tranší')}.`,
    postup: null,
  };
}

function pridejTriRoky(iso: string): string {
  const [r, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC((r ?? 1970) + 3, (m ?? 1) - 1, d ?? 1)).toISOString().slice(0, 10);
}
