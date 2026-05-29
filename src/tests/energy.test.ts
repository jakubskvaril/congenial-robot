import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getEnergy } from '../utils/energy';
import { BOB } from '../types';

describe('getEnergy', () => {
  const birthDate = new Date(BOB.birthDate).getTime();

  function setAgeMonths(months: number) {
    const ms = birthDate + months * 30.4375 * 24 * 60 * 60 * 1000;
    vi.setSystemTime(ms);
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns RER ≈ 70 × w^0.75', () => {
    setAgeMonths(6);
    const r = getEnergy(3.0);
    const expected = Math.round(70 * Math.pow(3.0, 0.75));
    expect(r.RER).toBe(expected);
  });

  it('factor=2.5 for intact kitten at 6 months', () => {
    setAgeMonths(6);
    const r = getEnergy(2.0);
    expect(r.factor).toBe(2.5);
    expect(r.lifeStage).toBe('kitten');
  });

  it('factor=2.0 for intact kitten at 12 months (Neva stays kitten until 18mo)', () => {
    setAgeMonths(12);
    const r = getEnergy(4.0);
    expect(r.factor).toBe(2.0);
    expect(r.lifeStage).toBe('kitten');
  });

  it('factor=1.4 for intact adult at 24 months', () => {
    setAgeMonths(24);
    const r = getEnergy(5.5);
    expect(r.factor).toBe(1.4);
    expect(r.lifeStage).toBe('adult');
  });

  it('kcal = RER × factor', () => {
    setAgeMonths(6);
    const r = getEnergy(2.0);
    expect(r.kcal).toBe(Math.round(r.RER * r.factor));
  });

  it('returns correct ageMonths', () => {
    setAgeMonths(5);
    const r = getEnergy(1.8);
    expect(r.ageMonths).toBeCloseTo(5, 0);
  });
});
