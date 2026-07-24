import { describe, it, expect } from 'vitest';
import { recommendDay, weeklyLowNutrients } from '../utils/recommend';
import type { DailyNutrients, NRCTargets } from '../types';

// Cíle zhruba odpovídající koťeti ~250 kcal/den
const targets: NRCTargets = {
  protein_g: 18.75, calcium_mg: 625, phosphorus_mg: 500, taurin_mg: 62.5,
  vitA_IU: 833, vitD3_IU: 70, vitE_mg: 1.9, iron_mg: 5, zinc_mg: 4.7,
  omega3_mg: 6.25,
};

function empty(): DailyNutrients {
  return {
    kcal: 0, protein_g: 0, fat_g: 0, calcium_mg: 0, phosphorus_mg: 0,
    taurin_mg: 0, vitA_IU: 0, vitD3_IU: 0, vitE_mg: 0, iron_mg: 0, zinc_mg: 0,
    omega3_mg: 0, caP_ratio: 0,
  };
}

describe('recommendDay', () => {
  it('suggests foods when the day is empty and calories remain', () => {
    const recs = recommendDay(empty(), targets, 250);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.length).toBeLessThanOrEqual(3);
  });

  it('respects the remaining calorie budget', () => {
    const recs = recommendDay(empty(), targets, 60);
    const total = recs.reduce((s, r) => s + r.kcal, 0);
    expect(total).toBeLessThanOrEqual(70); // malá tolerance na zaokrouhlení
  });

  it('recommends a calcium source when Ca is deficient (muscle-only day)', () => {
    // Simuluj den jen se svalovinou: hodně P, skoro žádné Ca
    const cur = { ...empty(), kcal: 150, protein_g: 30, phosphorus_mg: 300, calcium_mg: 10, taurin_mg: 60 };
    const recs = recommendDay(cur, targets, 100);
    const fillsCalcium = recs.some(r => r.fills.includes('vápník'));
    expect(fillsCalcium).toBe(true);
  });

  it('does not massively overshoot calcium (eggshell portion is scaled to deficit)', () => {
    // Prázdný den: doporučení nesmí nasypat několikanásobek denního Ca cíle
    const recs = recommendDay(empty(), targets, 250);
    let caAdded = 0;
    for (const r of recs) {
      // ca_mg je per 100 g
      caAdded += (r.meat.ca_mg * r.grams) / 100;
    }
    expect(caAdded).toBeLessThanOrEqual(targets.calcium_mg * 1.35);
  });

  it('never recommends the same food twice', () => {
    const recs = recommendDay(empty(), targets, 250);
    const ids = recs.map(r => r.meat.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not recommend when there is no calorie room', () => {
    const recs = recommendDay(empty(), targets, 0);
    expect(recs.length).toBe(0);
  });
});

describe('weeklyLowNutrients', () => {
  it('returns empty set with too little data', () => {
    const low = weeklyLowNutrients({ '2026-01-01': [] }, 'kitten');
    expect(low.size).toBe(0);
  });
});
