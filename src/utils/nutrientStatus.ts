import type { DailyNutrients, NRCTargets } from '../types';
import { NUTRIENT_CLASSES, NRC_PER_1000KCAL, NRC_SUL_PER_1000KCAL, type NutrientClass } from '../data/nrc';

/** Denní doporučené dávky (RA) škálované na energetickou potřebu kočky. */
export function dailyTargets(energyKcal: number, stage: 'kitten' | 'adult'): NRCTargets {
  const k = energyKcal / 1000;
  const p = NRC_PER_1000KCAL;
  return {
    protein_g: p.protein_g[stage] * k,
    calcium_mg: p.calcium_mg[stage] * k,
    phosphorus_mg: p.phosphorus_mg[stage] * k,
    taurin_mg: p.taurin_mg[stage] * k,
    vitA_IU: p.vitA_IU[stage] * k,
    vitD3_IU: p.vitD3_IU[stage] * k,
    vitE_mg: p.vitE_mg[stage] * k,
    iron_mg: p.iron_mg[stage] * k,
    zinc_mg: p.zinc_mg[stage] * k,
    omega3_mg: p.omega3_mg[stage] * k,
  };
}

/** Bezpečné horní limity (SUL) škálované na energetickou potřebu. */
export function dailyCeilings(energyKcal: number): Record<string, number> {
  const k = energyKcal / 1000;
  const out: Record<string, number> = {};
  for (const [key, per1000] of Object.entries(NRC_SUL_PER_1000KCAL)) out[key] = per1000 * k;
  return out;
}

// Decentní paleta — jediný zdroj je src/theme.ts
import { STATUS } from '../theme';
export const GREEN = STATUS.good;
export const AMBER = STATUS.warn;
export const RED   = STATUS.bad;
export const NEUTRAL = STATUS.neutral;

export type NutrientKey = keyof NRCTargets & keyof DailyNutrients;

export interface NutrientMeta {
  key: NutrientKey;
  label: string;
  unit: string;
  decimals: number;
}

// Pořadí a popisky nutrientů (jednotné pro home i Profil)
export const NUTRIENT_META: NutrientMeta[] = [
  { key: 'protein_g',     label: 'Bílkoviny', unit: 'g',  decimals: 0 },
  { key: 'taurin_mg',     label: 'Taurin',    unit: 'mg', decimals: 0 },
  { key: 'calcium_mg',    label: 'Vápník',    unit: 'mg', decimals: 0 },
  { key: 'phosphorus_mg', label: 'Fosfor',    unit: 'mg', decimals: 0 },
  { key: 'omega3_mg',     label: 'Omega-3',   unit: 'mg', decimals: 0 },
  { key: 'vitA_IU',       label: 'Vit. A',    unit: 'IU', decimals: 0 },
  { key: 'vitD3_IU',      label: 'Vit. D3',   unit: 'IU', decimals: 0 },
  { key: 'iron_mg',       label: 'Železo',    unit: 'mg', decimals: 1 },
  { key: 'zinc_mg',       label: 'Zinek',     unit: 'mg', decimals: 1 },
];

/**
 * Skupiny místo odznaků u každého řádku — orientaci dá jeden nadpis,
 * ne devět barevných štítků u jednotlivých živin.
 */
export interface NutrientGroup {
  title: string;
  note: string;
  keys: NutrientKey[];
}

export const NUTRIENT_GROUPS: NutrientGroup[] = [
  {
    title: 'Musí být splněno',
    note: 'nesmí chybět, přebytek se vyloučí',
    keys: ['protein_g', 'taurin_mg'],
  },
  {
    title: 'Trefit rozmezí',
    note: 'málo i moc škodí',
    keys: ['calcium_mg', 'phosphorus_mg', 'vitD3_IU'],
  },
  {
    title: 'Hlídat strop',
    note: 'přebytek se v těle kumuluje',
    keys: ['vitA_IU'],
  },
  {
    title: 'Dlouhodobě',
    note: 'průměr za 7 dní — jeden den nerozhoduje',
    keys: ['omega3_mg', 'iron_mg', 'zinc_mg'],
  },
];

export interface NutrientStatus {
  color: string;
  /** Krátký stav vpravo — bez emoji, bez procent stropu */
  primary: string;
  /** 0..1 výplň baru — VŽDY vůči doporučené denní dávce */
  fillFrac: number;
  /** Podrobnost do tooltipu (např. vzdálenost k bezpečnému stropu) */
  detail?: string;
  belowTarget: boolean;
  cls: NutrientClass;
}

const pct = (x: number) => Math.round(x * 100);

/**
 * Vyhodnotí nutrient vůči doporučené dávce. Stupnice je jednotná (% dávky);
 * bezpečný strop (sul) ovlivňuje jen barvu a slovní hodnocení, ne měřítko —
 * dvě různá měřítka v jednom grafu byla matoucí.
 */
export function nutrientStatus(
  key: string,
  value: number,
  target: number,
  sul: number | undefined,
): NutrientStatus {
  const cls = NUTRIENT_CLASSES[key] ?? 'flex';
  const rt = target > 0 ? value / target : 0;
  const rs = sul ? value / sul : 0;
  const belowTarget = value < target;
  const detail = sul ? `${pct(rs)} % bezpečného stropu` : undefined;
  const base = { belowTarget, cls, detail, fillFrac: Math.min(rt, 1) };

  // ── Pod doporučenou dávkou ──
  if (belowTarget) {
    const missing = pct(1 - rt);
    if (cls === 'flex') {
      return { ...base, color: AMBER, primary: `chybí ${missing} %` };
    }
    return { ...base, color: rt < 0.7 ? RED : AMBER, primary: `chybí ${missing} %` };
  }

  // ── Splněno až nadbytek ──
  if (sul) {
    if (rs >= 1)   return { ...base, color: RED,   primary: 'nad stropem', fillFrac: 1 };
    if (rs >= 0.7) return { ...base, color: AMBER, primary: 'blízko stropu', fillFrac: 1 };
  }
  if (cls === 'critical' && rt > 1.3) {
    return { ...base, color: AMBER, primary: `+${pct(rt - 1)} % nad`, fillFrac: 1 };
  }
  return { ...base, color: GREEN, primary: cls === 'critical' ? 'v normě' : 'splněno', fillFrac: 1 };
}
