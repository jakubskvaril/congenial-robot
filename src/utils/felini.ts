import { FELINI_PER_G } from '../data/felini';

/**
 * Vypočítá dávku Felini Complete pro dosažení Ca:P = 1.3:1
 * Vzorec: felini_g = (1.3 × P_mg − Ca_mg) / (193 − 1.3 × 30)
 * Zdroj: NRC 2006, Zentek & Schulz 2004
 */
export function calcFeliniDose(ca_mg: number, p_mg: number, grams: number): number {
  const totalCa = (ca_mg / 100) * grams;
  const totalP = (p_mg / 100) * grams;
  const dose = (1.3 * totalP - totalCa) / (FELINI_PER_G.calcium_mg - 1.3 * FELINI_PER_G.phosphorus_mg);
  return Math.max(0, Math.round(dose * 100) / 100);
}
