import { describe, expect, it } from 'vitest';
import { dniMezi, nejblizsiPredchozi, posledni, pridejDny, pridejRoky } from './datum';
import {
  formatDatum,
  formatDny,
  formatKc,
  formatKcSeZnamenkem,
  formatLetopis,
  formatProcenta,
  formatProcentaSeZnamenkem,
  plural,
  radova,
} from './money';

describe('money formatting', () => {
  it('uses a comma thousands separator and CZK after the number', () => {
    expect(formatKc(80_000)).toBe('80,000 CZK');
  });

  it('rounds only at display time', () => {
    expect(formatKc(80_000.6)).toBe('80,001 CZK');
  });

  it('renders missing values as a dash, never as zero', () => {
    expect(formatKc(null)).toBe('—');
    expect(formatKc(undefined)).toBe('—');
    expect(formatKc(NaN)).toBe('—');
    expect(formatProcenta(null)).toBe('—');
  });

  it('renders an actual zero as zero, not a dash', () => {
    expect(formatKc(0)).toBe('0 CZK');
  });

  it('signs use a typographic minus', () => {
    expect(formatKcSeZnamenkem(-1_100)).toBe('−1,100 CZK');
    expect(formatKcSeZnamenkem(4_200)).toBe('+4,200 CZK');
    expect(formatKcSeZnamenkem(0)).toBe('0 CZK');
  });

  it('percentages use a decimal point and a tight percent sign', () => {
    expect(formatProcenta(0.0742)).toBe('7.4%');
    expect(formatProcentaSeZnamenkem(-0.02)).toBe('−2.0%');
    expect(formatProcentaSeZnamenkem(0)).toBe('0.0%');
  });
});

describe('date formatting', () => {
  it('is unambiguous in every English variant', () => {
    expect(formatDatum('2026-07-31')).toBe('31 Jul 2026');
    expect(formatDatum('2026-01-05')).toBe('5 Jan 2026');
  });

  it('ordinals take the right suffix', () => {
    expect(radova(1)).toBe('1st');
    expect(radova(2)).toBe('2nd');
    expect(radova(3)).toBe('3rd');
    expect(radova(4)).toBe('4th');
    expect(radova(11)).toBe('11th');
    expect(radova(12)).toBe('12th');
    expect(radova(13)).toBe('13th');
    expect(radova(21)).toBe('21st');
    expect(radova(31)).toBe('31st');
  });

  it('the chronicle speaks in annals', () => {
    expect(formatLetopis('2026-07-31')).toBe(
      'In the year of our Lord 2026, on the 31st day of July',
    );
  });
});

describe('date arithmetic', () => {
  it('dniMezi counts whole days', () => {
    expect(dniMezi('2026-07-31', '2027-07-31')).toBe(365);
    expect(dniMezi('2026-01-01', '2026-07-01')).toBe(181);
  });

  it('a daylight-saving switch does not shift the day', () => {
    expect(dniMezi('2026-03-28', '2026-03-29')).toBe(1);
    expect(dniMezi('2026-10-24', '2026-10-25')).toBe(1);
  });

  it('pridejRoky drives the three-year holding test', () => {
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

  it('never reaches for a later date', () => {
    expect(nejblizsiPredchozi(rady, '2026-08-02')!.v).toBe(2);
  });

  it('an exact date match wins', () => {
    expect(nejblizsiPredchozi(rady, '2026-07-31')!.v).toBe(2);
  });

  it('returns null before the history begins', () => {
    expect(nejblizsiPredchozi(rady, '2026-01-01')).toBeNull();
  });

  it('posledni returns the newest regardless of today', () => {
    expect(posledni(rady)!.v).toBe(3);
    expect(posledni([])).toBeNull();
  });
});

describe('plurals', () => {
  it('uses the singular only for one', () => {
    expect(plural(1, 'tranche', 'tranches')).toBe('tranche');
    expect(plural(0, 'tranche', 'tranches')).toBe('tranches');
    expect(plural(3, 'tranche', 'tranches')).toBe('tranches');
  });

  it('formatDny pluralises days', () => {
    expect(formatDny(1)).toBe('1 day');
    expect(formatDny(3)).toBe('3 days');
    expect(formatDny(519)).toBe('519 days');
    expect(formatDny(0)).toBe('0 days');
  });
});
