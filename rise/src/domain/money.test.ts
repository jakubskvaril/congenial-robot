import { describe, expect, it } from 'vitest';
import { dniMezi, nejblizsiPredchozi, posledni, pridejDny, pridejRoky } from './datum';
import {
  formatDatum,
  formatKc,
  formatKcSeZnamenkem,
  formatLetopis,
  formatProcenta,
  formatProcentaSeZnamenkem,
  formatDny,
  sklonuj,
} from './money';

const NBSP = ' ';

describe('formátování peněz', () => {
  it('používá mezeru jako oddělovač tisíců a Kč za číslem', () => {
    expect(formatKc(80_000).replace(/[  ]/g, ' ')).toBe('80 000 Kč');
  });

  it('zaokrouhluje až při zobrazení', () => {
    expect(formatKc(80_000.6).replace(/[  ]/g, ' ')).toBe('80 001 Kč');
  });

  it('prázdné hodnoty jsou pomlčka, ne nula', () => {
    expect(formatKc(null)).toBe('—');
    expect(formatKc(undefined)).toBe('—');
    expect(formatKc(NaN)).toBe('—');
    expect(formatProcenta(null)).toBe('—');
  });

  it('nula je nula, ne pomlčka', () => {
    expect(formatKc(0)).toBe(`0${NBSP}Kč`.replace(NBSP, ' ').replace(' ', ' '));
  });

  it('znaménko používá typografický minus', () => {
    expect(formatKcSeZnamenkem(-1_100)).toContain('−');
    expect(formatKcSeZnamenkem(4_200)).toContain('+');
    expect(formatKcSeZnamenkem(0)).toBe('0 Kč');
  });

  it('procenta mají desetinnou čárku', () => {
    expect(formatProcenta(0.0742).replace(/[  ]/g, ' ')).toBe('7,4 %');
    expect(formatProcentaSeZnamenkem(-0.02).replace(/[  ]/g, ' ')).toBe('−2,0 %');
    expect(formatProcentaSeZnamenkem(0).replace(/[  ]/g, ' ')).toBe('0,0 %');
  });
});

describe('formátování dat', () => {
  it('datum je 31. 7. 2026', () => {
    expect(formatDatum('2026-07-31')).toBe('31. 7. 2026');
    expect(formatDatum('2026-01-05')).toBe('5. 1. 2026');
  });

  it('kronika mluví letopisem', () => {
    expect(formatLetopis('2026-07-31')).toBe('Léta Páně 2026, 31. dne července');
  });
});

describe('datumová aritmetika', () => {
  it('dniMezi počítá celé dny', () => {
    expect(dniMezi('2026-07-31', '2027-07-31')).toBe(365);
    expect(dniMezi('2026-01-01', '2026-07-01')).toBe(181);
  });

  it('přechod letního času neposune den', () => {
    expect(dniMezi('2026-03-28', '2026-03-29')).toBe(1);
    expect(dniMezi('2026-10-24', '2026-10-25')).toBe(1);
  });

  it('pridejRoky drží tříletý test', () => {
    expect(pridejRoky('2026-07-31', 3)).toBe('2029-07-31');
    expect(pridejDny('2026-07-31', 1)).toBe('2026-08-01');
  });
});

describe('nejblizsiPredchozi', () => {
  const rady = [
    { datum: '2026-07-29', v: 1 },
    { datum: '2026-07-31', v: 2 },
    { datum: '2026-08-05', v: 3 },
  ];

  it('nikdy nebere pozdější datum', () => {
    expect(nejblizsiPredchozi(rady, '2026-08-02')!.v).toBe(2);
  });

  it('shodné datum se bere', () => {
    expect(nejblizsiPredchozi(rady, '2026-07-31')!.v).toBe(2);
  });

  it('před začátkem historie vrací null', () => {
    expect(nejblizsiPredchozi(rady, '2026-01-01')).toBeNull();
  });

  it('posledni vrací nejnovější bez ohledu na dnešek', () => {
    expect(posledni(rady)!.v).toBe(3);
    expect(posledni([])).toBeNull();
  });
});

describe('skloňování', () => {
  it('řídí tvar podstatného jména po číslovce', () => {
    expect(sklonuj(1, 'tranše', 'tranše', 'tranší')).toBe('tranše');
    expect(sklonuj(3, 'tranše', 'tranše', 'tranší')).toBe('tranše');
    expect(sklonuj(6, 'tranše', 'tranše', 'tranší')).toBe('tranší');
    expect(sklonuj(0, 'tranše', 'tranše', 'tranší')).toBe('tranší');
  });

  it('formatDny skloňuje dny', () => {
    expect(formatDny(1)).toBe('1 den');
    expect(formatDny(3)).toBe('3 dny');
    expect(formatDny(519)).toBe('519 dní');
    expect(formatDny(0)).toBe('0 dní');
  });
});
