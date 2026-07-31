import { dnesIso } from '../domain/datum';
import { urovenSfery } from '../domain/levels';
import { VYCHOZI_PRAHY } from '../domain/rules';
import type { SferaId, Stav } from '../domain/types';
import { oceniPortfolio, SFERY } from '../domain/valuation';

export function vychoziStav(): Stav {
  const stav = kostra();
  // Výchozí vklad není stavba — za úrovně, se kterými se začíná, se level-up
  // nepřehrává. První sekvenci spustí až to, co uživatel skutečně vloží.
  stav.videnUrovne = urovneStavu(stav);
  return stav;
}

/** Úrovně všech sfér podle aktuálního ocenění. */
export function urovneStavu(stav: Stav, dnes = dnesIso()): Record<SferaId, number> {
  const portfolio = oceniPortfolio(stav.aktiva, stav.kurzy, dnes);
  const urovne = {} as Record<SferaId, number>;
  for (const s of SFERY) urovne[s] = urovenSfery(s, portfolio.sfery[s].hodnota).lvl;
  return urovne;
}

function kostra(): Stav {
  return {
    verze: 1,
    aktiva: [
      {
        id: 'csob-penzijko',
        sferaId: 'castle',
        nazev: 'ČSOB penzijní fond',
        mena: 'CZK',
        ocenovani: 'sazba',
        planovanaSazbaPa: 0.035,
        rezimDane: 'penzijni',
        vklady: [
          { id: 'v1', datum: '2026-07-31', castka: 80_000, poznamka: 'vstupní vklad' },
        ],
        ceny: [],
      },
      {
        id: 'vwce',
        sferaId: 'wall',
        nazev: 'Vanguard FTSE All-World UCITS ETF (Acc)',
        isin: 'IE00BK5BQT80',
        ticker: 'VWCE.DE',
        mena: 'EUR',
        ocenovani: 'jednotky',
        planovanaSazbaPa: 0.0742,
        akumulacni: true,
        rezimDane: 'casovyTest',
        vklady: [],
        ceny: [],
      },
      {
        id: 'xdwt',
        sferaId: 'horde',
        nazev: 'Xtrackers MSCI World Information Technology UCITS ETF 1C',
        isin: 'IE00BM67HT60',
        ticker: 'XDWT.DE',
        mena: 'EUR',
        ocenovani: 'jednotky',
        planovanaSazbaPa: 0.1036,
        akumulacni: true,
        rezimDane: 'casovyTest',
        vklady: [],
        ceny: [],
      },
    ],
    kurzy: {},
    nastaveni: {
      zobrazitProjekce: true,
      nocniRezim: 'auto',
      prahy: { ...VYCHOZI_PRAHY },
    },
    kronika: [
      {
        id: 'k1',
        datum: '2026-07-31',
        typ: 'vklad',
        sferaId: 'castle',
        text: 'Do pokladny hradu uloženo 80 000 Kč.',
      },
    ],
  };
}
