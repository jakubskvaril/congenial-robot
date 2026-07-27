import type { LogEntry, MeatItem, Pouch } from '../types';
import { MEATS } from '../data/meats';
import { FELINI_PER_G } from '../data/felini';
import { calcFeliniDose } from './felini';

function nowHHMM(): string {
  const d = new Date();
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

export function todayISO(): string {
  // Lokální datum, ne UTC — jinak se jídlo zapsané po půlnoci uloží do včerejška
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function logMeat(meat: MeatItem, grams: number, withFelini: boolean): Omit<LogEntry, 'id'> {
  const f = grams / 100;
  const feliniDose = withFelini ? calcFeliniDose(meat.ca_mg, meat.p_mg, grams) : 0;
  const fd = feliniDose;

  return {
    date: todayISO(),
    time: nowHHMM(),
    type: 'meat',
    name: meat.name,
    grams,
    kcal: Math.round(meat.kcal * f),
    protein_g: Math.round(meat.protein * f * 10) / 10,
    fat_g: Math.round(meat.fat * f * 10) / 10,
    calcium_mg: Math.round(meat.ca_mg * f + FELINI_PER_G.calcium_mg * fd),
    phosphorus_mg: Math.round(meat.p_mg * f + FELINI_PER_G.phosphorus_mg * fd),
    taurin_mg: Math.round(meat.taurin_mg * f + FELINI_PER_G.taurin_mg * fd),
    vitA_IU: Math.round(meat.vitA_IU * f + FELINI_PER_G.vitA_IU * fd),
    vitD3_IU: Math.round(meat.vitD3_IU * f + FELINI_PER_G.vitD3_IU * fd),
    vitE_mg: Math.round(FELINI_PER_G.vitE_mg * fd * 10) / 10,
    iron_mg: Math.round((meat.iron_mg * f + FELINI_PER_G.iron_mg * fd) * 100) / 100,
    zinc_mg: Math.round((meat.zinc_mg * f + FELINI_PER_G.zinc_mg * fd) * 100) / 100,
    omega3_mg: Math.round((meat.omega3_mg ?? 0) * f),
    feliniDose_g: withFelini ? fd : undefined,
  };
}

export function logPouch(pouch: Pouch, grams: number): Omit<LogEntry, 'id'> {
  const f = grams / 100;
  const n = pouch.nutrients;
  return {
    date: todayISO(),
    time: nowHHMM(),
    type: 'pouch',
    name: `${pouch.brand} – ${pouch.name}`,
    grams,
    kcal: Math.round(pouch.kcalPer100g * f),
    protein_g: Math.round((n.protein ?? 0) * f * 10) / 10,
    fat_g: Math.round((n.fat ?? 0) * f * 10) / 10,
    calcium_mg: Math.round(((n.calcium ?? 0) / 10000) * grams),
    phosphorus_mg: Math.round(((n.phosphorus ?? 0) / 10000) * grams),
    taurin_mg: Math.round(((n.taurinMgKg ?? 0) / 1000) * grams),
    vitA_IU: Math.round(((n.vitaminA ?? 0) / 1000) * grams),
    vitD3_IU: Math.round(((n.vitaminD3 ?? 0) / 1000) * grams),
    vitE_mg: 0,
    iron_mg: 0,
    zinc_mg: 0,
    pouchId: pouch.id,
  };
}

export function logFelini(grams: number): Omit<LogEntry, 'id'> {
  return {
    date: todayISO(),
    time: nowHHMM(),
    type: 'felini',
    name: 'Felini Complete',
    grams,
    kcal: 0,
    protein_g: 0,
    fat_g: 0,
    calcium_mg: Math.round(FELINI_PER_G.calcium_mg * grams),
    phosphorus_mg: Math.round(FELINI_PER_G.phosphorus_mg * grams),
    taurin_mg: Math.round(FELINI_PER_G.taurin_mg * grams),
    vitA_IU: Math.round(FELINI_PER_G.vitA_IU * grams),
    vitD3_IU: Math.round(FELINI_PER_G.vitD3_IU * grams),
    vitE_mg: Math.round(FELINI_PER_G.vitE_mg * grams * 10) / 10,
    iron_mg: Math.round(FELINI_PER_G.iron_mg * grams * 100) / 100,
    zinc_mg: Math.round(FELINI_PER_G.zinc_mg * grams * 100) / 100,
  };
}

export function sumNutrients(entries: LogEntry[]) {
  const sum = {
    kcal: 0, protein_g: 0, fat_g: 0, calcium_mg: 0, phosphorus_mg: 0,
    taurin_mg: 0, vitA_IU: 0, vitD3_IU: 0, vitE_mg: 0, iron_mg: 0, zinc_mg: 0,
    omega3_mg: 0,
  };
  for (const e of entries) {
    sum.kcal += e.kcal;
    sum.protein_g += e.protein_g;
    sum.fat_g += e.fat_g;
    sum.calcium_mg += e.calcium_mg;
    sum.phosphorus_mg += e.phosphorus_mg;
    sum.taurin_mg += e.taurin_mg;
    sum.vitA_IU += e.vitA_IU;
    sum.vitD3_IU += e.vitD3_IU;
    sum.vitE_mg += e.vitE_mg;
    sum.iron_mg += e.iron_mg;
    sum.zinc_mg += e.zinc_mg;
    sum.omega3_mg += e.omega3_mg ?? 0;
  }
  return {
    ...sum,
    caP_ratio: sum.phosphorus_mg > 0 ? Math.round((sum.calcium_mg / sum.phosphorus_mg) * 100) / 100 : 0,
  };
}

export function getMeatById(id: string): MeatItem | undefined {
  return MEATS.find(m => m.id === id);
}

/**
 * ID nejčastěji zapisovaných jídel (nejnovější zápisy váží víc).
 * Používá se pro sekci "Nejčastější" ve výběru masa.
 */
export function topLoggedFoodIds(
  logs: Record<string, LogEntry[]>,
  known: Map<string, string>, // název → id
  limit = 3,
): string[] {
  const score: Record<string, number> = {};
  const days = Object.keys(logs).sort().slice(-60); // poslední 2 měsíce stačí
  for (const d of days) {
    for (const e of logs[d] ?? []) {
      if (e.type !== 'meat') continue;
      const id = known.get(e.name);
      if (!id) continue;
      score[id] = (score[id] ?? 0) + 1;
    }
  }
  return Object.entries(score)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

/** Seřazené datumy dnů, které mají aspoň jeden záznam. */
export function loggedDays(logs: Record<string, LogEntry[]>): string[] {
  return Object.keys(logs).filter(d => (logs[d]?.length ?? 0) > 0).sort();
}

export type NutrientSum = ReturnType<typeof sumNutrients>;

/** Průměr živin na den přes zadané dny (prázdné → nuly). */
export function avgNutrientsPerDay(
  logs: Record<string, LogEntry[]>,
  days: string[],
): NutrientSum {
  const acc = sumNutrients([]); // nulový základ
  if (days.length === 0) return acc;
  for (const d of days) {
    const s = sumNutrients(logs[d] ?? []);
    for (const key of Object.keys(acc) as (keyof NutrientSum)[]) {
      if (key === 'caP_ratio') continue;
      acc[key] += s[key];
    }
  }
  const n = days.length;
  for (const key of Object.keys(acc) as (keyof NutrientSum)[]) {
    if (key === 'caP_ratio') continue;
    acc[key] = Math.round((acc[key] / n) * 100) / 100;
  }
  acc.caP_ratio = acc.phosphorus_mg > 0
    ? Math.round((acc.calcium_mg / acc.phosphorus_mg) * 100) / 100 : 0;
  return acc;
}
