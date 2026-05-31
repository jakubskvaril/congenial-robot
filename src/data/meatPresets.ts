import type { MeatDraft } from '../utils/barcode';

export interface MeatPreset extends MeatDraft {
  emoji: string;
  category: 'beef' | 'pork' | 'chicken' | 'turkey' | 'fish' | 'other';
}

// Hodnoty z české potravinové databáze (SZPI/ÚZEI) a USDA SR Legacy, na 100g
export const CZECH_MEAT_PRESETS: MeatPreset[] = [
  // ── Hovězí ───────────────────────────────────────────────────────────────
  {
    emoji: '🐄',
    category: 'beef',
    name: 'Hovězí maso',
    kcal: 170, protein: 20.0, fat: 9.5,
    ca_mg: 12, p_mg: 190, taurin_mg: 50,
    vitA_IU: 0, vitD3_IU: 0, iron_mg: 2.2, zinc_mg: 5.5,
  },
  {
    emoji: '🥩',
    category: 'beef',
    name: 'Mleté hovězí',
    kcal: 210, protein: 18.5, fat: 14.0,
    ca_mg: 12, p_mg: 182, taurin_mg: 50,
    vitA_IU: 0, vitD3_IU: 0, iron_mg: 2.0, zinc_mg: 4.7,
  },
  {
    emoji: '🥩',
    category: 'beef',
    name: 'Hovězí svíčková',
    kcal: 135, protein: 22.0, fat: 5.0,
    ca_mg: 8, p_mg: 215, taurin_mg: 50,
    vitA_IU: 0, vitD3_IU: 0, iron_mg: 2.1, zinc_mg: 3.8,
  },
  // ── Kuřecí ───────────────────────────────────────────────────────────────
  {
    emoji: '🍗',
    category: 'chicken',
    name: 'Kuřecí prso',
    kcal: 112, protein: 23.0, fat: 2.0,
    ca_mg: 14, p_mg: 220, taurin_mg: 50,
    vitA_IU: 0, vitD3_IU: 0, iron_mg: 0.7, zinc_mg: 1.2,
  },
  {
    emoji: '🍗',
    category: 'chicken',
    name: 'Kuřecí stehno',
    kcal: 195, protein: 18.5, fat: 13.0,
    ca_mg: 14, p_mg: 194, taurin_mg: 50,
    vitA_IU: 0, vitD3_IU: 0, iron_mg: 1.0, zinc_mg: 2.4,
  },
  // ── Vepřové ──────────────────────────────────────────────────────────────
  {
    emoji: '🐷',
    category: 'pork',
    name: 'Vepřové maso',
    kcal: 215, protein: 18.5, fat: 15.0,
    ca_mg: 11, p_mg: 180, taurin_mg: 50,
    vitA_IU: 0, vitD3_IU: 0, iron_mg: 1.1, zinc_mg: 2.9,
  },
  {
    emoji: '🐷',
    category: 'pork',
    name: 'Vepřová krkovice',
    kcal: 260, protein: 16.0, fat: 22.0,
    ca_mg: 9, p_mg: 175, taurin_mg: 50,
    vitA_IU: 0, vitD3_IU: 0, iron_mg: 0.9, zinc_mg: 2.6,
  },
  // ── Krůtí ────────────────────────────────────────────────────────────────
  {
    emoji: '🦃',
    category: 'turkey',
    name: 'Krůtí prso',
    kcal: 104, protein: 22.0, fat: 1.5,
    ca_mg: 15, p_mg: 215, taurin_mg: 50,
    vitA_IU: 0, vitD3_IU: 0, iron_mg: 0.7, zinc_mg: 1.6,
  },
  // ── Ryby ─────────────────────────────────────────────────────────────────
  {
    emoji: '🐟',
    category: 'fish',
    name: 'Losos',
    kcal: 208, protein: 20.0, fat: 13.0,
    ca_mg: 15, p_mg: 252, taurin_mg: 50,
    vitA_IU: 101, vitD3_IU: 447, iron_mg: 0.7, zinc_mg: 0.8,
  },
  {
    emoji: '🐟',
    category: 'fish',
    name: 'Treska',
    kcal: 82, protein: 18.0, fat: 0.7,
    ca_mg: 16, p_mg: 170, taurin_mg: 50,
    vitA_IU: 45, vitD3_IU: 40, iron_mg: 0.5, zinc_mg: 0.5,
  },
  // ── Ostatní ──────────────────────────────────────────────────────────────
  {
    emoji: '🐇',
    category: 'other',
    name: 'Králík',
    kcal: 136, protein: 20.5, fat: 5.5,
    ca_mg: 18, p_mg: 202, taurin_mg: 50,
    vitA_IU: 0, vitD3_IU: 0, iron_mg: 1.3, zinc_mg: 2.4,
  },
  {
    emoji: '🫀',
    category: 'other',
    name: 'Kuřecí srdce',
    kcal: 127, protein: 18.5, fat: 5.5,
    ca_mg: 12, p_mg: 186, taurin_mg: 50,
    vitA_IU: 35, vitD3_IU: 0, iron_mg: 5.3, zinc_mg: 2.4,
  },
  {
    emoji: '🫁',
    category: 'other',
    name: 'Kuřecí játra',
    kcal: 116, protein: 16.0, fat: 4.5,
    ca_mg: 11, p_mg: 296, taurin_mg: 50,
    vitA_IU: 11078, vitD3_IU: 0, iron_mg: 9.0, zinc_mg: 2.7,
  },
  {
    emoji: '🐑',
    category: 'other',
    name: 'Jehněčí',
    kcal: 225, protein: 17.0, fat: 17.0,
    ca_mg: 15, p_mg: 180, taurin_mg: 50,
    vitA_IU: 0, vitD3_IU: 0, iron_mg: 1.7, zinc_mg: 3.7,
  },
];
