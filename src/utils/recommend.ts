import type { DailyNutrients, NRCTargets, MeatItem, LogEntry } from '../types';
import { MEATS, SUPPLEMENTS } from '../data/meats';
import { NRC_PER_1000KCAL, type NutrientClass, NUTRIENT_CLASSES } from '../data/nrc';
import { sumNutrients } from './nutrients';

export interface FoodSuggestion {
  meat: MeatItem;
  grams: number;
  fills: string[];   // lidské názvy nutrientů, které porce doplní
  kcal: number;
}

/** Nutrienty, které umíme reálně ovlivnit naším katalogem jídel. */
const DRIVERS: { key: keyof NRCTargets & keyof DailyNutrients; label: string; weight: number }[] = [
  { key: 'calcium_mg',    label: 'vápník',    weight: 3 },
  { key: 'taurin_mg',     label: 'taurin',    weight: 3 },
  { key: 'omega3_mg',     label: 'omega-3',   weight: 2 },
  { key: 'protein_g',     label: 'bílkoviny', weight: 1 },
  { key: 'iron_mg',       label: 'železo',    weight: 1 },
  { key: 'zinc_mg',       label: 'zinek',     weight: 1 },
];

// Stropové nutrienty (rozpustné v tucích) — porci zamítni, pokud by přestřelila
const CEILINGS: (keyof NRCTargets & keyof DailyNutrients)[] = ['vitA_IU', 'vitD3_IU'];
const CEILING_LIMIT = 1.5; // max 150 % denního cíle

function nutrientOf(m: MeatItem, key: string): number {
  switch (key) {
    case 'calcium_mg':    return m.ca_mg;
    case 'phosphorus_mg': return m.p_mg;
    case 'taurin_mg':     return m.taurin_mg;
    case 'protein_g':     return m.protein;
    case 'iron_mg':       return m.iron_mg;
    case 'zinc_mg':       return m.zinc_mg;
    case 'vitA_IU':       return m.vitA_IU;
    case 'vitD3_IU':      return m.vitD3_IU;
    case 'vitE_mg':       return 0;
    case 'omega3_mg':     return m.omega3_mg ?? 0;
    default:              return 0;
  }
}

function portionFor(m: MeatItem, remainingKcal: number): number {
  // Doplňky mají pevnou porci; masa výchozích 40 g, omezené zbývajícími kcal
  let g = m.defaultGrams ?? 40;
  if (m.kcal > 0) {
    const maxByKcal = (remainingKcal / m.kcal) * 100;
    g = Math.min(g, maxByKcal);
  }
  return Math.round(g);
}

/**
 * Navrhne 1–3 konkrétní jídla, která nejlépe doplní dnešní deficit.
 * @param weeklyLowKeys nutrienty dlouhodobě (7 dní) pod cílem → zvýšená priorita
 */
export function recommendDay(
  current: DailyNutrients,
  targets: NRCTargets,
  remainingKcal: number,
  weeklyLowKeys: Set<string> = new Set(),
): FoodSuggestion[] {
  const suggestions: FoodSuggestion[] = [];
  // Pracovní kopie — po každém výběru přičteme přidané hodnoty
  const acc: Record<string, number> = { ...current } as unknown as Record<string, number>;
  let kcalLeft = Math.max(0, remainingKcal);

  const candidates = [...MEATS.filter(m => m.id !== 'kibble'), ...SUPPLEMENTS];

  for (let pick = 0; pick < 3; pick++) {
    // Zbývající deficity pro řídicí nutrienty
    const deficits = DRIVERS.map(d => ({
      ...d,
      deficit: Math.max(0, targets[d.key] - (acc[d.key] ?? 0)),
      w: d.weight * (weeklyLowKeys.has(d.key) ? 1.6 : 1),
    })).filter(d => d.deficit > targets[d.key] * 0.08); // ignoruj <8 % mezeru

    if (deficits.length === 0 || kcalLeft < 8) break;

    let best: { food: MeatItem; grams: number; score: number; fills: string[] } | null = null;

    for (const food of candidates) {
      const grams = portionFor(food, kcalLeft);
      if (grams < 3) continue;
      const f = grams / 100;
      const addKcal = food.kcal * f;
      if (addKcal > kcalLeft + 5) continue;

      // Zamítni přestřelení stropových vitaminů
      let overCeiling = false;
      for (const c of CEILINGS) {
        const after = (acc[c] ?? 0) + nutrientOf(food, c) * f;
        if (after > targets[c] * CEILING_LIMIT) { overCeiling = true; break; }
      }
      if (overCeiling) continue;

      // Skóre = kolik váženého deficitu porce zaplní (frakce cíle)
      let score = 0;
      const fills: string[] = [];
      for (const d of deficits) {
        const added = nutrientOf(food, d.key) * f;
        if (added <= 0) continue;
        const useful = Math.min(added, d.deficit) / targets[d.key];
        if (useful > 0.05) {
          score += d.w * useful;
          fills.push(d.label);
        }
      }
      if (score <= 0) continue;

      if (!best || score > best.score) {
        best = { food, grams, score, fills: fills.slice(0, 2) };
      }
    }

    if (!best) break;

    // Zaloguj výběr a přičti jeho hodnoty
    const f = best.grams / 100;
    for (const key of Object.keys(acc)) {
      acc[key] = (acc[key] ?? 0) + nutrientOf(best.food, key) * f;
    }
    kcalLeft -= best.food.kcal * f;
    suggestions.push({
      meat: best.food,
      grams: best.grams,
      fills: best.fills,
      kcal: Math.round(best.food.kcal * f),
    });
  }

  return suggestions;
}

/**
 * Nutrienty dlouhodobě pod cílem — průměr posledních 7 dní vs. denní cíl.
 * Cíle jsou per 1000 kcal; použijeme průměrný denní příjem kcal pro škálování.
 */
export function weeklyLowNutrients(
  logs: Record<string, LogEntry[]>,
  stage: 'kitten' | 'adult',
): Set<string> {
  const days = Object.keys(logs).filter(d => (logs[d]?.length ?? 0) > 0).sort().slice(-7);
  const low = new Set<string>();
  if (days.length < 3) return low; // málo dat na trend

  let totKcal = 0;
  const tot: Record<string, number> = {};
  for (const d of days) {
    const s = sumNutrients(logs[d]);
    totKcal += s.kcal;
    for (const [k, v] of Object.entries(s)) {
      if (typeof v === 'number') tot[k] = (tot[k] ?? 0) + v;
    }
  }
  if (totKcal <= 0) return low;

  const k = totKcal / 1000; // celkový násobek 1000 kcal za období
  const perK = NRC_PER_1000KCAL;
  const check: [string, number][] = [
    ['calcium_mg',  perK.calcium_mg[stage]  * k],
    ['taurin_mg',   perK.taurin_mg[stage]   * k],
    ['omega3_mg',   perK.omega3_mg[stage]   * k],
    ['iron_mg',     perK.iron_mg[stage]     * k],
    ['zinc_mg',     perK.zinc_mg[stage]     * k],
  ];
  for (const [key, target] of check) {
    if ((tot[key] ?? 0) < target * 0.8) low.add(key); // pod 80 % = chronicky málo
  }
  return low;
}

/** Klasifikace nutrientu pro UI (přesně/min./strop/orientačně). */
export function classOf(key: string): NutrientClass {
  return NUTRIENT_CLASSES[key] ?? 'flex';
}
