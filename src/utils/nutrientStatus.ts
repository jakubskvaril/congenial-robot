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

// Decentní paleta — červená jen u skutečného rizika
export const GREEN = '#3F9E5A';
export const AMBER = '#C99A2E';
export const RED   = '#C2410C';
export const NEUTRAL = '#9A948C';

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

export type BadgeTone = 'neutral' | 'amber' | 'red' | 'default';

export interface NutrientStatus {
  color: string;
  primary: string;     // barevný text vpravo
  fillFrac: number;    // 0..1 výplň baru
  raTickFrac?: number; // pozice značky doporučené dávky (u stropových)
  badgeTone: BadgeTone;
  belowTarget: boolean;
  cls: NutrientClass;
}

const pct = (x: number) => Math.round(x * 100);

/**
 * Vyhodnotí jeden nutrient vůči doporučené dávce (target) a bezpečnému
 * stropu (sul). U vitaminů A/D řídí stupnici strop, ne doporučená dávka.
 */
export function nutrientStatus(
  key: string,
  value: number,
  target: number,
  sul: number | undefined,
): NutrientStatus {
  const cls = NUTRIENT_CLASSES[key] ?? 'flex';
  const rt = target > 0 ? value / target : 0;
  const excessMatters = cls === 'ceiling' || cls === 'critical';
  const byCeiling = !!sul && excessMatters;
  const rs = sul ? value / sul : 0;
  const raTick = byCeiling ? target / sul! : undefined;
  const belowTarget = value < target;

  // Odznak u stropových vitaminů reaguje na blízkost stropu (ne na překročení RA)
  let badgeTone: BadgeTone = 'default';
  if (cls === 'ceiling' && sul) {
    badgeTone = rs >= 0.9 ? 'red' : rs >= 0.7 ? 'amber' : 'neutral';
  }

  const base = { badgeTone, belowTarget, cls };

  // ── Deficit ──
  if (belowTarget) {
    const missing = pct(1 - rt);
    if (cls === 'flex') {
      return { ...base, color: AMBER, primary: rt >= 0.6 ? `zbývá ${missing} %` : `chybí ${missing} %`, fillFrac: rt };
    }
    const color = rt < 0.7 ? RED : AMBER;
    return { ...base, color, primary: `chybí ${missing} %`, fillFrac: byCeiling ? rs : rt, raTickFrac: raTick };
  }

  // ── Dostatečné až nadbytek ──
  if (byCeiling) {
    if (rs <= 0.7) return { ...base, color: GREEN, primary: `${pct(rs)} % stropu`, fillFrac: rs, raTickFrac: raTick };
    if (rs < 1)    return { ...base, color: AMBER, primary: `${pct(rs)} % stropu`, fillFrac: rs, raTickFrac: raTick };
    return { ...base, color: RED, primary: 'nad strop!', fillFrac: 1, raTickFrac: raTick };
  }
  if (cls === 'critical') {
    if (rt <= 1.3) return { ...base, color: GREEN, primary: 'v normě', fillFrac: Math.min(rt, 1) };
    return { ...base, color: AMBER, primary: `+${pct(rt - 1)} % nad`, fillFrac: 1 };
  }
  if (sul && rs > 1) return { ...base, color: RED, primary: 'nad strop!', fillFrac: 1 };
  return { ...base, color: GREEN, primary: '✓ splněno', fillFrac: 1 };
}
