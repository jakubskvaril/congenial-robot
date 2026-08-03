import { describe, expect, it } from 'vitest';
import { VYCHOZI_PRAHY, vyhodnotZakony } from './rules';
import type { Aktivum } from './types';
import { oceniPortfolio } from './valuation';

function portfolioZ(aktiva: Aktivum[], dnes = '2026-07-31') {
  return { portfolio: oceniPortfolio(aktiva, {}, dnes), aktiva, dnes };
}

function czkAktivum(over: Partial<Aktivum>): Aktivum {
  return {
    id: 'a',
    sferaId: 'castle',
    nazev: 'Aktivum',
    mena: 'CZK',
    ocenovani: 'sazba',
    planovanaSazbaPa: 0,
    vklady: [],
    ceny: [],
    ...over,
  };
}

function zakon(aktiva: Aktivum[], id: string, dnes = '2026-07-31') {
  const { portfolio } = portfolioZ(aktiva, dnes);
  const z = vyhodnotZakony(portfolio, aktiva, VYCHOZI_PRAHY, dnes).find((x) => x.id === id);
  if (!z) throw new Error(`zákon ${id} chybí`);
  return z;
}

describe('vyhodnotZakony', () => {
  it('vrací všech pět zákonů', () => {
    const { portfolio } = portfolioZ([]);
    const zakony = vyhodnotZakony(portfolio, [], VYCHOZI_PRAHY, '2026-07-31');
    expect(zakony.map((z) => z.id)).toEqual([
      'hradby-plan',
      'horda-strop',
      'it-expozice',
      'akumulacni',
      'casovy-test',
    ]);
  });
});

describe('strop Hordy', () => {
  it('prázdná Horda je v pořádku', () => {
    expect(zakon([], 'horda-strop').stav).toBe('ok');
  });

  it('varuje od 90 % stropu', () => {
    const a = czkAktivum({
      sferaId: 'horde',
      vklady: [{ id: 'v', datum: '2026-07-31', castka: 41_000 }],
    });
    expect(zakon([a], 'horda-strop').stav).toBe('varovani');
  });

  it('nad stropem hlásí porušení', () => {
    const a = czkAktivum({
      sferaId: 'horde',
      vklady: [{ id: 'v', datum: '2026-07-31', castka: 46_000 }],
    });
    const z = zakon([a], 'horda-strop');
    expect(z.stav).toBe('poruseno');
    expect(z.detail).toContain('1,000 CZK');
  });

  it('počítá se z vkladů, ne z hodnoty', () => {
    // 40 000 vloženo, ale po roce má hodnotu přes 44 000 → pořád v pořádku
    const a = czkAktivum({
      sferaId: 'horde',
      planovanaSazbaPa: 0.1036,
      vklady: [{ id: 'v', datum: '2026-07-31', castka: 40_000 }],
    });
    const z = zakon([a], 'horda-strop', '2027-07-31');
    expect(z.stav).toBe('ok');
    expect(z.hodnota).toContain('40,000 CZK');
  });
});

describe('IT expozice', () => {
  it('bez peněz je neurčená', () => {
    expect(zakon([], 'it-expozice').stav).toBe('neurceno');
  });

  it('samotné Hradby zůstávají pod 40 % (25 % odhad)', () => {
    const a = czkAktivum({
      sferaId: 'wall',
      vklady: [{ id: 'v', datum: '2026-07-31', castka: 100_000 }],
    });
    const z = zakon([a], 'it-expozice');
    expect(z.stav).toBe('ok');
    expect(z.hodnota).toBe('25.0%');
  });

  it('velká Horda zákon poruší a odcituje ho', () => {
    const wall = czkAktivum({
      id: 'w',
      sferaId: 'wall',
      vklady: [{ id: 'v1', datum: '2026-07-31', castka: 50_000 }],
    });
    const horde = czkAktivum({
      id: 'h',
      sferaId: 'horde',
      vklady: [{ id: 'v2', datum: '2026-07-31', castka: 50_000 }],
    });
    const z = zakon([wall, horde], 'it-expozice');
    // (50 000 × 0,25 + 50 000) / 100 000 = 62,5 %
    expect(z.hodnota).toBe('62.5%');
    expect(z.stav).toBe('poruseno');
    expect(z.detail).toContain('The law says');
  });
});

describe('plán Hradeb', () => {
  it('prázdné Hradby mají zbývat všech šest tranší', () => {
    expect(zakon([], 'hradby-plan').hodnota).toBe('6 tranches left');
  });

  it('po dvou tranších zbývají čtyři', () => {
    const a = czkAktivum({
      sferaId: 'wall',
      vklady: [{ id: 'v', datum: '2026-07-31', castka: 53_400 }],
    });
    expect(zakon([a], 'hradby-plan').hodnota).toBe('4 tranches left');
  });

  it('jedna zbývající tranše je v jednotném čísle', () => {
    const a = czkAktivum({
      sferaId: 'wall',
      vklady: [{ id: 'v', datum: '2026-07-31', castka: 133_500 }],
    });
    expect(zakon([a], 'hradby-plan').hodnota).toBe('1 tranche left');
  });

  it('po naplnění je hotovo', () => {
    const a = czkAktivum({
      sferaId: 'wall',
      vklady: [{ id: 'v', datum: '2026-07-31', castka: 160_200 }],
    });
    const z = zakon([a], 'hradby-plan');
    expect(z.stav).toBe('ok');
    expect(z.hodnota).toBe('complete');
  });
});

describe('akumulační třídy', () => {
  const etf = (akumulacni: boolean | undefined): Aktivum =>
    czkAktivum({ sferaId: 'wall', ocenovani: 'jednotky', akumulacni });

  it('nezaškrtnuté je neurčené', () => {
    expect(zakon([etf(undefined)], 'akumulacni').stav).toBe('neurceno');
  });

  it('akumulační projde', () => {
    expect(zakon([etf(true)], 'akumulacni').stav).toBe('ok');
  });

  it('distribuční poruší', () => {
    expect(zakon([etf(false)], 'akumulacni').stav).toBe('poruseno');
  });

  it('penzijko v režimu sazba se nekontroluje', () => {
    const penzijko = czkAktivum({ ocenovani: 'sazba' });
    expect(zakon([penzijko], 'akumulacni').hodnota).toBe('—');
  });
});

describe('tříletý časový test', () => {
  it('bez tranší je neurčený', () => {
    expect(zakon([], 'casovy-test').hodnota).toBe('—');
  });

  it('ukáže nejbližší datum uzrání', () => {
    const a = czkAktivum({
      vklady: [
        { id: 'v1', datum: '2026-07-31', castka: 1_000 },
        { id: 'v2', datum: '2026-09-15', castka: 1_000 },
      ],
    });
    const z = zakon([a], 'casovy-test');
    expect(z.hodnota).toBe('31 Jul 2029');
    expect(z.detail).toContain('1096 days');
  });

  it('penzijní režim se do testu nepočítá', () => {
    const penzijko = czkAktivum({
      rezimDane: 'penzijni',
      vklady: [{ id: 'v1', datum: '2026-07-31', castka: 80_000 }],
    });
    expect(zakon([penzijko], 'casovy-test').hodnota).toBe('—');
  });

  it('po třech letech je vše uzrálé', () => {
    const a = czkAktivum({ vklady: [{ id: 'v1', datum: '2026-07-31', castka: 1_000 }] });
    expect(zakon([a], 'casovy-test', '2030-01-01').hodnota).toBe('all matured');
  });
});
