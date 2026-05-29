import { describe, it, expect } from 'vitest';
import { computeLifetimeStats } from '../utils/lifetime';
import type { LogEntry } from '../types';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: crypto.randomUUID(),
    date: '2026-01-01',
    time: '12:00',
    type: 'meat',
    name: 'Kuřecí kýta',
    grams: 100,
    kcal: 110,
    protein_g: 18.5,
    fat_g: 4.3,
    calcium_mg: 12,
    phosphorus_mg: 189,
    taurin_mg: 50,
    vitA_IU: 18,
    vitD3_IU: 0,
    vitE_mg: 0,
    iron_mg: 0.96,
    zinc_mg: 1.8,
    ...overrides,
  };
}

describe('computeLifetimeStats', () => {
  it('returns zero stats for empty logs', () => {
    const stats = computeLifetimeStats({});
    expect(stats.totalDaysLogged).toBe(0);
    expect(stats.totalKcal).toBe(0);
    expect(stats.firstLogDate).toBeNull();
  });

  it('sums kcal across entries', () => {
    const logs = {
      '2026-01-01': [makeEntry({ kcal: 200 }), makeEntry({ kcal: 300 })],
    };
    const stats = computeLifetimeStats(logs);
    expect(stats.totalKcal).toBe(500);
    expect(stats.totalMeals).toBe(2);
    expect(stats.totalDaysLogged).toBe(1);
  });

  it('counts felini doses', () => {
    const logs = {
      '2026-01-01': [
        makeEntry({ type: 'felini', kcal: 0 }),
        makeEntry({ type: 'felini', kcal: 0 }),
        makeEntry({ kcal: 110 }),
      ],
    };
    const stats = computeLifetimeStats(logs);
    expect(stats.totalFeliniDoses).toBe(2);
  });

  it('calculates topMeats sorted by grams', () => {
    const logs = {
      '2026-01-01': [
        makeEntry({ name: 'Maso A', grams: 300 }),
        makeEntry({ name: 'Maso B', grams: 100 }),
        makeEntry({ name: 'Maso A', grams: 200 }),
      ],
    };
    const stats = computeLifetimeStats(logs);
    expect(stats.topMeats[0].name).toBe('Maso A');
    expect(stats.topMeats[0].totalGrams).toBe(500);
  });

  it('calculates monthly averages', () => {
    const logs = {
      '2026-01-01': [makeEntry({ kcal: 200, date: '2026-01-01' }), makeEntry({ kcal: 200, date: '2026-01-01' })],
      '2026-01-02': [makeEntry({ kcal: 400, date: '2026-01-02' })],
    };
    const stats = computeLifetimeStats(logs);
    expect(stats.monthlyAvgKcal[0].month).toBe('2026-01');
    expect(stats.monthlyAvgKcal[0].avgKcal).toBe(400); // (200+200+400) / 2 days = 400
  });
});
