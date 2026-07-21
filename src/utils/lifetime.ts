import type { LogEntry } from '../types';

export interface LifetimeStats {
  totalDaysLogged: number;
  firstLogDate: string | null;
  totalMeals: number;
  totalKcal: number;
  totalProtein_g: number;
  totalFat_g: number;
  totalTaurin_mg: number;
  totalCalcium_mg: number;
  totalPhosphorus_mg: number;
  totalVitA_IU: number;
  totalVitD3_IU: number;
  totalFeliniDoses: number;
  topMeats: Array<{ name: string; totalGrams: number; count: number }>;
  topPouches: Array<{ name: string; totalGrams: number; count: number }>;
  monthlyAvgKcal: Array<{ month: string; avgKcal: number }>;
}

export function computeLifetimeStats(logs: Record<string, LogEntry[]>): LifetimeStats {
  // Prázdné dny (po smazání všech jídel zůstane klíč s []) se nepočítají —
  // nafukovaly by "dní sledování" a snižovaly průměr kcal/den
  const dates = Object.keys(logs).filter(d => (logs[d]?.length ?? 0) > 0).sort();
  const allEntries = dates.flatMap(d => logs[d] ?? []);

  const meatMap: Record<string, { totalGrams: number; count: number }> = {};
  const pouchMap: Record<string, { totalGrams: number; count: number }> = {};
  const monthMap: Record<string, { totalKcal: number; days: Set<string> }> = {};

  let totalKcal = 0, totalProtein_g = 0, totalFat_g = 0;
  let totalTaurin_mg = 0, totalCalcium_mg = 0, totalPhosphorus_mg = 0;
  let totalVitA_IU = 0, totalVitD3_IU = 0, totalFeliniDoses = 0;

  for (const e of allEntries) {
    totalKcal += e.kcal;
    totalProtein_g += e.protein_g;
    totalFat_g += e.fat_g;
    totalTaurin_mg += e.taurin_mg;
    totalCalcium_mg += e.calcium_mg;
    totalPhosphorus_mg += e.phosphorus_mg;
    totalVitA_IU += e.vitA_IU;
    totalVitD3_IU += e.vitD3_IU;
    if (e.type === 'felini') totalFeliniDoses++;

    if (e.type === 'meat') {
      if (!meatMap[e.name]) meatMap[e.name] = { totalGrams: 0, count: 0 };
      meatMap[e.name].totalGrams += e.grams;
      meatMap[e.name].count++;
    }
    if (e.type === 'pouch') {
      if (!pouchMap[e.name]) pouchMap[e.name] = { totalGrams: 0, count: 0 };
      pouchMap[e.name].totalGrams += e.grams;
      pouchMap[e.name].count++;
    }

    const month = e.date.slice(0, 7);
    if (!monthMap[month]) monthMap[month] = { totalKcal: 0, days: new Set() };
    monthMap[month].totalKcal += e.kcal;
    monthMap[month].days.add(e.date);
  }

  const topMeats = Object.entries(meatMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.totalGrams - a.totalGrams)
    .slice(0, 5);

  const topPouches = Object.entries(pouchMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const monthlyAvgKcal = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      avgKcal: Math.round(v.totalKcal / v.days.size),
    }));

  return {
    totalDaysLogged: dates.length,
    firstLogDate: dates[0] ?? null,
    totalMeals: allEntries.length,
    totalKcal: Math.round(totalKcal),
    totalProtein_g: Math.round(totalProtein_g),
    totalFat_g: Math.round(totalFat_g),
    totalTaurin_mg: Math.round(totalTaurin_mg),
    totalCalcium_mg: Math.round(totalCalcium_mg),
    totalPhosphorus_mg: Math.round(totalPhosphorus_mg),
    totalVitA_IU: Math.round(totalVitA_IU),
    totalVitD3_IU: Math.round(totalVitD3_IU),
    totalFeliniDoses,
    topMeats,
    topPouches,
    monthlyAvgKcal,
  };
}
