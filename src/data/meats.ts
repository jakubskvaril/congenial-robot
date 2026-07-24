import type { MeatItem } from '../types';

// Hodnoty na 100 g syrové váhy. Zdroje: USDA FoodData Central,
// taurin: Spitze et al. 2003; omega3 = EPA+DHA (mg/100g, USDA).
export const MEATS: MeatItem[] = [
  { id: 'chicken_thigh',  name: 'Kuřecí kýta (syrová)',        kcal: 110, protein: 18.5, fat: 4.3,  ca_mg: 12,   p_mg: 189, taurin_mg: 50,  vitA_IU: 18,    vitD3_IU: 0,   iron_mg: 0.96, zinc_mg: 1.8,  omega3_mg: 30   },
  { id: 'chicken_heart',  name: 'Kuřecí srdce',                 kcal: 128, protein: 17.0, fat: 7.0,  ca_mg: 9,    p_mg: 177, taurin_mg: 330, vitA_IU: 6,     vitD3_IU: 0,   iron_mg: 6.26, zinc_mg: 1.7,  omega3_mg: 30   },
  { id: 'chicken_liver',  name: 'Kuřecí játra',                 kcal: 119, protein: 17.0, fat: 5.0,  ca_mg: 11,   p_mg: 297, taurin_mg: 107, vitA_IU: 11640, vitD3_IU: 0,   iron_mg: 11.1, zinc_mg: 2.7,  omega3_mg: 80   },
  { id: 'beef',           name: 'Hovězí svalovina',             kcal: 143, protein: 20.0, fat: 7.0,  ca_mg: 6,    p_mg: 175, taurin_mg: 43,  vitA_IU: 0,     vitD3_IU: 0,   iron_mg: 2.1,  zinc_mg: 4.6,  omega3_mg: 20   },
  { id: 'salmon',         name: 'Losos (syrový)',               kcal: 142, protein: 20.0, fat: 7.0,  ca_mg: 13,   p_mg: 252, taurin_mg: 130, vitA_IU: 40,    vitD3_IU: 447, iron_mg: 0.34, zinc_mg: 0.37, omega3_mg: 2100 },
  { id: 'turkey',         name: 'Krůtí maso',                   kcal: 104, protein: 22.0, fat: 2.0,  ca_mg: 18,   p_mg: 186, taurin_mg: 60,  vitA_IU: 0,     vitD3_IU: 0,   iron_mg: 0.99, zinc_mg: 1.7,  omega3_mg: 20   },
  { id: 'lamb',           name: 'Jehněčí maso',                 kcal: 130, protein: 18.0, fat: 7.0,  ca_mg: 14,   p_mg: 168, taurin_mg: 47,  vitA_IU: 0,     vitD3_IU: 0,   iron_mg: 1.4,  zinc_mg: 3.6,  omega3_mg: 50   },
  { id: 'pork_leg',       name: 'Vepřová kýta (syrová)',        kcal: 136, protein: 20.9, fat: 5.9,  ca_mg: 12,   p_mg: 218, taurin_mg: 50,  vitA_IU: 4,     vitD3_IU: 10,  iron_mg: 1.0,  zinc_mg: 2.5,  omega3_mg: 20   },

  // ── Drůbež ──────────────────────────────────────────────────────────────
  { id: 'chicken_breast', name: 'Kuřecí prsa',                  kcal: 120, protein: 22.5, fat: 2.6,  ca_mg: 5,    p_mg: 213, taurin_mg: 18,  vitA_IU: 21,    vitD3_IU: 0,   iron_mg: 0.37, zinc_mg: 0.68, omega3_mg: 20   },
  { id: 'chicken_gizzard',name: 'Kuřecí žaludky',               kcal: 94,  protein: 17.7, fat: 2.1,  ca_mg: 11,   p_mg: 148, taurin_mg: 180, vitA_IU: 64,    vitD3_IU: 0,   iron_mg: 2.5,  zinc_mg: 2.7,  omega3_mg: 30   },
  { id: 'chicken_neck',   name: 'Kuřecí krky (s kostí)',        kcal: 155, protein: 14.0, fat: 10.0, ca_mg: 1200, p_mg: 700, taurin_mg: 60,  vitA_IU: 30,    vitD3_IU: 0,   iron_mg: 1.5,  zinc_mg: 2.0,  omega3_mg: 30   },
  { id: 'turkey_heart',   name: 'Krůtí srdce',                  kcal: 113, protein: 16.2, fat: 5.1,  ca_mg: 8,    p_mg: 185, taurin_mg: 300, vitA_IU: 0,     vitD3_IU: 0,   iron_mg: 3.4,  zinc_mg: 2.5,  omega3_mg: 30   },
  { id: 'duck_breast',    name: 'Kachní prsa (bez kůže)',       kcal: 135, protein: 18.3, fat: 5.9,  ca_mg: 3,    p_mg: 203, taurin_mg: 70,  vitA_IU: 79,    vitD3_IU: 4,   iron_mg: 4.5,  zinc_mg: 1.9,  omega3_mg: 80   },

  // ── Hovězí vnitřnosti ───────────────────────────────────────────────────
  { id: 'beef_heart',     name: 'Hovězí srdce',                 kcal: 112, protein: 17.7, fat: 3.9,  ca_mg: 7,    p_mg: 212, taurin_mg: 120, vitA_IU: 0,     vitD3_IU: 0,   iron_mg: 4.3,  zinc_mg: 1.7,  omega3_mg: 30   },
  { id: 'beef_liver',     name: 'Hovězí játra',                 kcal: 135, protein: 20.4, fat: 3.6,  ca_mg: 5,    p_mg: 387, taurin_mg: 69,  vitA_IU: 16900, vitD3_IU: 49,  iron_mg: 4.9,  zinc_mg: 4.0,  omega3_mg: 40   },
  { id: 'beef_kidney',    name: 'Hovězí ledvinky',              kcal: 99,  protein: 17.4, fat: 3.1,  ca_mg: 13,   p_mg: 257, taurin_mg: 100, vitA_IU: 1400,  vitD3_IU: 45,  iron_mg: 4.6,  zinc_mg: 1.9,  omega3_mg: 80   },

  // ── Vepřové vnitřnosti (před podáváním přemrazit!) ──────────────────────
  { id: 'pork_heart',     name: 'Vepřové srdce',                kcal: 118, protein: 17.3, fat: 4.4,  ca_mg: 5,    p_mg: 169, taurin_mg: 160, vitA_IU: 0,     vitD3_IU: 0,   iron_mg: 4.7,  zinc_mg: 2.8,  omega3_mg: 30   },
  { id: 'pork_liver',     name: 'Vepřová játra',                kcal: 134, protein: 21.4, fat: 3.7,  ca_mg: 9,    p_mg: 288, taurin_mg: 60,  vitA_IU: 21650, vitD3_IU: 44,  iron_mg: 23.3, zinc_mg: 5.8,  omega3_mg: 50   },

  // ── Ryby ────────────────────────────────────────────────────────────────
  { id: 'sardines_canned',name: 'Sardinky v konzervě (okapané)',kcal: 208, protein: 24.6, fat: 11.5, ca_mg: 382,  p_mg: 490, taurin_mg: 150, vitA_IU: 108,   vitD3_IU: 193, iron_mg: 2.9,  zinc_mg: 1.3,  omega3_mg: 980  },
  { id: 'mackerel',       name: 'Makrela (syrová)',             kcal: 205, protein: 18.6, fat: 13.9, ca_mg: 12,   p_mg: 217, taurin_mg: 160, vitA_IU: 167,   vitD3_IU: 643, iron_mg: 1.6,  zinc_mg: 0.6,  omega3_mg: 2300 },
  { id: 'cod',            name: 'Treska (syrová)',              kcal: 82,  protein: 17.8, fat: 0.7,  ca_mg: 16,   p_mg: 203, taurin_mg: 120, vitA_IU: 40,    vitD3_IU: 36,  iron_mg: 0.38, zinc_mg: 0.45, omega3_mg: 190  },

  // ── Ostatní ─────────────────────────────────────────────────────────────
  { id: 'rabbit',         name: 'Králičí maso',                 kcal: 136, protein: 20.0, fat: 5.5,  ca_mg: 13,   p_mg: 224, taurin_mg: 37,  vitA_IU: 0,     vitD3_IU: 0,   iron_mg: 3.2,  zinc_mg: 1.0,  omega3_mg: 50   },

  { id: 'kibble',         name: 'Granule (průměr)',             kcal: 360, protein: 35.0, fat: 18.0, ca_mg: 120,  p_mg: 90,  taurin_mg: 200, vitA_IU: 2000,  vitD3_IU: 200, iron_mg: 10,   zinc_mg: 10,   omega3_mg: 300  },
];

// ── Vejce a doplňky (defaultGrams = typická porce, předvyplní se) ──────────
export const SUPPLEMENTS: MeatItem[] = [
  { id: 'egg_whole',  name: 'Vejce slepičí celé (1 ks ≈ 50 g)',    kind: 'supplement', defaultGrams: 50,  kcal: 143, protein: 12.6, fat: 9.5,  ca_mg: 56,    p_mg: 198, taurin_mg: 0, vitA_IU: 540,  vitD3_IU: 82,  iron_mg: 1.75, zinc_mg: 1.29, omega3_mg: 60    },
  { id: 'egg_yolk',   name: 'Žloutek (1 ks ≈ 18 g)',                kind: 'supplement', defaultGrams: 18,  kcal: 322, protein: 15.9, fat: 26.5, ca_mg: 129,   p_mg: 390, taurin_mg: 0, vitA_IU: 1270, vitD3_IU: 218, iron_mg: 2.73, zinc_mg: 2.30, omega3_mg: 115   },
  // Skořápka: ~38 % elementárního Ca → 1 skořápka (5,5 g) ≈ 2100 mg Ca
  { id: 'eggshell',   name: 'Vaječná skořápka drcená (1 ks ≈ 5,5 g)', kind: 'supplement', defaultGrams: 5.5, kcal: 0,   protein: 0,    fat: 0,    ca_mg: 38000, p_mg: 140, taurin_mg: 0, vitA_IU: 0,    vitD3_IU: 0,   iron_mg: 0,    zinc_mg: 0,    omega3_mg: 0     },
  // Lososový olej: EPA+DHA ~30 % — 2 g (½ lžičky) ≈ 600 mg omega-3
  { id: 'salmon_oil', name: 'Lososový olej (½ lžičky ≈ 2 g)',       kind: 'supplement', defaultGrams: 2,   kcal: 900, protein: 0,    fat: 100,  ca_mg: 0,     p_mg: 0,   taurin_mg: 0, vitA_IU: 0,    vitD3_IU: 0,   iron_mg: 0,    zinc_mg: 0,    omega3_mg: 30000 },
];
