import { describe, it, expect } from 'vitest';
import { removeLogItem, addLogEntry } from '../store/logs';
import type { LogEntry } from '../types';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'test-id',
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

describe('removeLogItem', () => {
  it('removes entry by id', () => {
    const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b' }), makeEntry({ id: 'c' })];
    const result = removeLogItem(entries, 'b');
    expect(result.map(e => e.id)).toEqual(['a', 'c']);
  });

  it('returns same array if id not found', () => {
    const entries = [makeEntry({ id: 'a' })];
    const result = removeLogItem(entries, 'z');
    expect(result).toHaveLength(1);
  });

  it('handles empty array', () => {
    expect(removeLogItem([], 'any')).toEqual([]);
  });
});

describe('addLogEntry', () => {
  it('creates entry with required defaults', () => {
    const entry = addLogEntry({ name: 'Test', kcal: 50 });
    expect(entry.name).toBe('Test');
    expect(entry.kcal).toBe(50);
    expect(entry.id).toBeTruthy();
    expect(entry.protein_g).toBe(0);
  });

  it('merges partial overrides', () => {
    const entry = addLogEntry({ type: 'felini', grams: 2 });
    expect(entry.type).toBe('felini');
    expect(entry.grams).toBe(2);
  });

  it('generates unique ids', () => {
    const a = addLogEntry({});
    const b = addLogEntry({});
    expect(a.id).not.toBe(b.id);
  });
});
