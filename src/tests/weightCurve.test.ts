import { describe, it, expect } from 'vitest';
import { getReferenceWeight, WEIGHT_CURVE_MALE } from '../data/weightCurve';

describe('getReferenceWeight', () => {
  it('returns birth weight at 0 months', () => {
    expect(getReferenceWeight(0)).toBe(0.10);
  });

  it('returns max weight at end of curve (36 months)', () => {
    const last = WEIGHT_CURVE_MALE[WEIGHT_CURVE_MALE.length - 1];
    expect(getReferenceWeight(last.months)).toBe(last.kg);
  });

  it('returns max weight beyond curve end', () => {
    expect(getReferenceWeight(999)).toBe(WEIGHT_CURVE_MALE[WEIGHT_CURVE_MALE.length - 1].kg);
  });

  it('interpolates between known points', () => {
    // Between month 0 (0.10kg) and month 1 (0.35kg)
    const mid = getReferenceWeight(0.5);
    expect(mid).toBeGreaterThan(0.10);
    expect(mid).toBeLessThan(0.35);
    expect(mid).toBeCloseTo(0.225, 2);
  });

  it('returns exact value for known data points', () => {
    expect(getReferenceWeight(12)).toBe(4.50);
    expect(getReferenceWeight(18)).toBe(5.50);
    expect(getReferenceWeight(36)).toBe(7.00);
  });
});
