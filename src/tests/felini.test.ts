import { describe, it, expect } from 'vitest';
import { calcFeliniDose } from '../utils/felini';

describe('calcFeliniDose', () => {
  it('returns ~1.52g for 100g chicken thigh (ca=12, p=189)', () => {
    const dose = calcFeliniDose(12, 189, 100);
    expect(dose).toBeCloseTo(1.52, 1);
  });

  it('returns ~0.99g for 65g chicken thigh', () => {
    const dose = calcFeliniDose(12, 189, 65);
    expect(dose).toBeCloseTo(0.99, 1);
  });

  it('returns 0 when Ca already meets 1.3:1 (no supplement needed)', () => {
    // If ca_mg/p_mg already ≥ 1.3, dose should be 0
    const dose = calcFeliniDose(200, 100, 100);
    expect(dose).toBe(0);
  });

  it('scales linearly with grams', () => {
    const dose100 = calcFeliniDose(12, 189, 100);
    const dose200 = calcFeliniDose(12, 189, 200);
    expect(dose200).toBeCloseTo(dose100 * 2, 1);
  });

  it('result achieves Ca:P ≈ 1.3 when felini added', () => {
    const grams = 100;
    const ca_mg_per100g = 12;
    const p_mg_per100g = 189;
    const dose = calcFeliniDose(ca_mg_per100g, p_mg_per100g, grams);
    const totalCa = ca_mg_per100g + dose * 193;
    const totalP = p_mg_per100g + dose * 30;
    expect(totalCa / totalP).toBeCloseTo(1.3, 1);
  });
});
