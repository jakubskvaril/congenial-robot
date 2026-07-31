import { describe, expect, it } from 'vitest';
import type { Aktivum, Kurzy } from './types';
import { cenaKDatu, kurzKDatu, oceniAktivum, oceniPortfolio, projekce } from './valuation';

const kurzy: Kurzy = {
  '2026-07-30': { EUR: 24.6 },
  '2026-07-31': { EUR: 24.65 },
  '2026-08-14': { EUR: 25.0 },
};

function etf(over: Partial<Aktivum> = {}): Aktivum {
  return {
    id: 'vwce',
    sferaId: 'wall',
    nazev: 'VWCE',
    ticker: 'VWCE.DE',
    mena: 'EUR',
    ocenovani: 'jednotky',
    planovanaSazbaPa: 0.0742,
    vklady: [],
    ceny: [],
    ...over,
  };
}

describe('kurzKDatu', () => {
  it('CZK je vždy 1', () => {
    expect(kurzKDatu({}, 'CZK', '2026-07-31')).toBe(1);
  });

  it('bere nejbližší předchozí, ne nejbližší jakýkoli', () => {
    // 2026-08-01 je sobota v tomto testu: nejbližší kurz je 31. 7., ne 14. 8.
    expect(kurzKDatu(kurzy, 'EUR', '2026-08-01')).toBe(24.65);
  });

  it('shodné datum má přednost', () => {
    expect(kurzKDatu(kurzy, 'EUR', '2026-07-31')).toBe(24.65);
  });

  it('před nejstarším známým kurzem vezme ten nejstarší', () => {
    expect(kurzKDatu(kurzy, 'EUR', '2020-01-01')).toBe(24.6);
  });

  it('neznámá měna → null', () => {
    expect(kurzKDatu(kurzy, 'USD', '2026-07-31')).toBeNull();
  });
});

describe('cenaKDatu', () => {
  const ceny = [
    { datum: '2026-07-20', cena: 100, zdroj: 'rucne' as const },
    { datum: '2026-07-31', cena: 110, zdroj: 'rucne' as const },
  ];

  it('nejbližší předchozí', () => {
    expect(cenaKDatu(ceny, '2026-07-25')).toEqual({ cena: 100, odhad: false });
  });

  it('před historií se označí jako odhad', () => {
    expect(cenaKDatu(ceny, '2026-01-01')).toEqual({ cena: 100, odhad: true });
  });

  it('prázdná historie → null', () => {
    expect(cenaKDatu([], '2026-07-25')).toBeNull();
  });
});

describe('oceniAktivum — režim jednotky', () => {
  it('spočítá jednotky, hodnotu a zisk podle kurzu i ceny k datu vkladu', () => {
    const a = etf({
      vklady: [{ id: 'v1', datum: '2026-07-31', castka: 24_650, cenaZaKus: 100 }],
      ceny: [{ datum: '2026-08-14', cena: 110, zdroj: 'rucne' }],
    });
    const o = oceniAktivum(a, kurzy, '2026-08-14');

    // 24 650 Kč / (100 EUR × 24,65) = 10 jednotek
    expect(o.jednotky).toBeCloseTo(10, 9);
    // 10 × 110 EUR × 25,00 = 27 500 Kč
    expect(o.hodnota).toBeCloseTo(27_500, 6);
    expect(o.vlozeno).toBe(24_650);
    expect(o.zisk).toBeCloseTo(2_850, 6);
    expect(o.ziskPct).toBeCloseTo(2_850 / 24_650, 9);
    expect(o.prumernaNakupniCena).toBeCloseTo(100, 9);
  });

  it('poplatek se odečte před nákupem jednotek', () => {
    const a = etf({
      vklady: [{ id: 'v1', datum: '2026-07-31', castka: 24_650, poplatek: 2_465, cenaZaKus: 100 }],
      ceny: [{ datum: '2026-07-31', cena: 100, zdroj: 'rucne' }],
    });
    const o = oceniAktivum(a, kurzy, '2026-07-31');
    expect(o.jednotky).toBeCloseTo(9, 9);
    expect(o.poplatky).toBe(2_465);
    // hodnota je nižší než vloženo přesně o poplatek
    expect(o.hodnota).toBeCloseTo(22_185, 6);
    expect(o.zisk).toBeCloseTo(-2_465, 6);
  });

  it('bez ceny za kus se cena dohledá z historie', () => {
    const a = etf({
      vklady: [{ id: 'v1', datum: '2026-08-01', castka: 24_650 }],
      ceny: [
        { datum: '2026-07-31', cena: 100, zdroj: 'rucne' },
        { datum: '2026-08-14', cena: 100, zdroj: 'rucne' },
      ],
    });
    const o = oceniAktivum(a, kurzy, '2026-08-14');
    expect(o.jednotky).toBeCloseTo(24_650 / (100 * 24.65), 9);
  });

  it('bez jakékoli ceny spadne na nominál a vyhradí se', () => {
    const a = etf({ vklady: [{ id: 'v1', datum: '2026-07-31', castka: 10_000 }] });
    const o = oceniAktivum(a, kurzy, '2026-08-14');
    expect(o.hodnota).toBeCloseTo(10_000 * Math.pow(1.0742, 14 / 365.25), 6);
    expect(o.jednotky).toBeNull();
    expect(o.vyhrady).toContain('bez-ceny');
  });

  it('cena starší než 7 dní se označí', () => {
    const a = etf({
      vklady: [{ id: 'v1', datum: '2026-07-31', castka: 24_650, cenaZaKus: 100 }],
      ceny: [{ datum: '2026-07-31', cena: 100, zdroj: 'rucne' }],
    });
    expect(oceniAktivum(a, kurzy, '2026-08-14').vyhrady).toContain('cena-stara');
    expect(oceniAktivum(a, kurzy, '2026-08-05').vyhrady).not.toContain('cena-stara');
  });

  it('prázdné aktivum je na nule a bez zisku v procentech', () => {
    const o = oceniAktivum(etf(), kurzy, '2026-08-14');
    expect(o.vlozeno).toBe(0);
    expect(o.hodnota).toBe(0);
    expect(o.ziskPct).toBeNull();
    expect(o.vynosPa).toBeNull();
  });
});

describe('oceniAktivum — režim sazba', () => {
  const penzijko: Aktivum = {
    id: 'csob-penzijko',
    sferaId: 'castle',
    nazev: 'ČSOB penzijní fond',
    mena: 'CZK',
    ocenovani: 'sazba',
    planovanaSazbaPa: 0.035,
    rezimDane: 'penzijni',
    vklady: [{ id: 'v1', datum: '2026-07-31', castka: 80_000 }],
    ceny: [],
  };

  it('v den vkladu se hodnota rovná vkladu', () => {
    const o = oceniAktivum(penzijko, {}, '2026-07-31');
    expect(o.hodnota).toBeCloseTo(80_000, 6);
    expect(o.zisk).toBeCloseTo(0, 6);
  });

  it('po roce vyroste o sazbu', () => {
    const o = oceniAktivum(penzijko, {}, '2027-07-31');
    expect(o.hodnota).toBeCloseTo(80_000 * Math.pow(1.035, 365 / 365.25), 4);
    expect(o.vynosPa).toBeCloseTo(0.035, 3);
  });

  it('penzijní režim nemá tříletý časový test', () => {
    const o = oceniAktivum(penzijko, {}, '2026-07-31');
    expect(o.transe[0]!.uzraje).toBeNull();
    expect(o.transe[0]!.dniDoUzrani).toBeNull();
  });

  it('ostatní aktiva mají uzrání za tři roky', () => {
    const a = etf({
      vklady: [{ id: 'v1', datum: '2026-07-31', castka: 10_000, cenaZaKus: 100 }],
      ceny: [{ datum: '2026-07-31', cena: 100, zdroj: 'rucne' }],
    });
    const o = oceniAktivum(a, kurzy, '2026-07-31');
    expect(o.transe[0]!.uzraje).toBe('2029-07-31');
    expect(o.transe[0]!.dniDoUzrani).toBe(1096);
  });
});

describe('oceniPortfolio', () => {
  const aktiva: Aktivum[] = [
    {
      id: 'csob',
      sferaId: 'castle',
      nazev: 'ČSOB',
      mena: 'CZK',
      ocenovani: 'sazba',
      planovanaSazbaPa: 0.035,
      vklady: [{ id: 'v1', datum: '2026-07-31', castka: 80_000 }],
      ceny: [],
    },
    etf({
      vklady: [{ id: 'v2', datum: '2026-07-31', castka: 24_650, cenaZaKus: 100 }],
      ceny: [{ datum: '2026-07-31', cena: 100, zdroj: 'rucne' }],
    }),
    etf({ id: 'xdwt', sferaId: 'horde', nazev: 'XDWT' }),
  ];

  it('sečte sféry a spočítá váhy', () => {
    const p = oceniPortfolio(aktiva, kurzy, '2026-07-31');
    expect(p.vlozeno).toBe(104_650);
    expect(p.hodnota).toBeCloseTo(104_650, 4);
    expect(p.sfery.castle.hodnota).toBeCloseTo(80_000, 6);
    expect(p.sfery.wall.hodnota).toBeCloseTo(24_650, 6);
    expect(p.sfery.horde.hodnota).toBe(0);
    expect(p.sfery.castle.vahaPct).toBeCloseTo(80_000 / 104_650, 6);
    expect(p.sfery.horde.vahaPct).toBe(0);
  });

  it('výchozí stav: prázdné sféry nemají zisk v procentech ani p.a.', () => {
    const p = oceniPortfolio(aktiva, kurzy, '2026-07-31');
    expect(p.sfery.wall.ziskPct).toBeCloseTo(0, 9);
    expect(p.sfery.horde.ziskPct).toBeNull();
    expect(p.sfery.horde.vynosPa).toBeNull();
  });

  it('nulové portfolio nedělí nulou', () => {
    const p = oceniPortfolio([], {}, '2026-07-31');
    expect(p.hodnota).toBe(0);
    expect(p.ziskPct).toBeNull();
    expect(p.sfery.castle.vahaPct).toBeNull();
  });
});

describe('projekce', () => {
  it('složí hodnotu podle sazby sféry', () => {
    const p = oceniPortfolio(
      [
        {
          id: 'csob',
          sferaId: 'castle',
          nazev: 'ČSOB',
          mena: 'CZK',
          ocenovani: 'sazba',
          planovanaSazbaPa: 0.035,
          vklady: [{ id: 'v1', datum: '2026-07-31', castka: 100_000 }],
          ceny: [],
        },
      ],
      {},
      '2026-07-31',
    );
    const body = projekce(p, { castle: 0.035, wall: 0.0742, horde: 0.1036 }, [0, 10]);
    expect(body[0]!.castle).toBeCloseTo(100_000, 4);
    expect(body[1]!.castle).toBeCloseTo(100_000 * Math.pow(1.035, 10), 4);
  });
});
