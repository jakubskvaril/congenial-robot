// NRC 2006 denní cíle per 1000 kcal ME
export const NRC_PER_1000KCAL = {
  protein_g:     { kitten: 75,    adult: 52    },
  calcium_mg:    { kitten: 2500,  adult: 720   },
  phosphorus_mg: { kitten: 2000,  adult: 640   },
  taurin_mg:     { kitten: 250,   adult: 250   },
  vitA_IU:       { kitten: 3334,  adult: 3334  },
  vitD3_IU:      { kitten: 280,   adult: 56    },
  vitE_mg:       { kitten: 7.5,   adult: 7.5   },
  iron_mg:       { kitten: 20,    adult: 20    },
  zinc_mg:       { kitten: 18.75, adult: 18.75 },
  // EPA+DHA: NRC 2006 RA pro koťata 25 mg/1000 kcal (vývoj mozku a sítnice —
  // DHA); pro dospělé NRC minimum nestanovuje, 30 mg je běžně doporučovaná
  // udržovací hodnota
  omega3_mg:     { kitten: 25,    adult: 30    },
};

/**
 * Jak přísně je potřeba nutrient trefit (dle NRC 2006 / klinické literatury):
 *
 * - 'critical' → trefit PŘESNĚ. Málo i moc škodí.
 *     Ca, P: u koťat nutriční sekundární hyperparatyreóza při nedostatku,
 *     poruchy skeletu při přebytku; přebytek P dlouhodobě zatěžuje ledviny.
 * - 'floor'    → NESMÍ CHYBĚT, přebytek neškodí (vyloučí se).
 *     Taurin: deficit → dilatační kardiomyopatie a degenerace sítnice
 *     (Pion et al. 1987); nadbytek se vyloučí močí.
 *     Bílkoviny: obligátní karnivor; přebytek zdravé kočce nevadí.
 *     Vit. E: deficit při rybí stravě (steatitida); přebytek velmi bezpečný.
 * - 'ceiling'  → POZOR NA PŘEBYTEK (rozpustné v tucích, kumulují se).
 *     Vit. A: hypervitaminóza A z jater → exostózy krční páteře
 *     (deformující cervikální spondylóza); kočka neumí regulovat vstřebávání.
 *     Stačí týdenní průměr v normě, denní výkyvy nevadí.
 *     (Pozn.: vit. D3 je 'critical' — deficit u domácí svalové stravy vede
 *     k rachitidě/osteomalacii, přebytek k hyperkalcémii; obojí škodí.)
 * - 'flex'     → stačí PŘIBLIŽNĚ / dlouhodobý průměr.
 *     Fe, Zn: deficit se rozvíjí týdny; omega-3 (EPA+DHA): podpora vývoje
 *     mozku, bez akutního deficitního syndromu.
 */
export type NutrientClass = 'critical' | 'floor' | 'ceiling' | 'flex';

export const NUTRIENT_CLASSES: Record<string, NutrientClass> = {
  protein_g:     'floor',
  calcium_mg:    'critical',
  phosphorus_mg: 'critical',
  taurin_mg:     'floor',
  vitA_IU:       'ceiling',
  vitD3_IU:      'critical', // deficit (rachitida) i přebytek (hyperkalcémie) škodí

  vitE_mg:       'floor',
  iron_mg:       'flex',
  zinc_mg:       'flex',
  omega3_mg:     'flex',
};

export const CLASS_INFO: Record<NutrientClass, { badge: string; hint: string }> = {
  critical: { badge: '🎯 přesně',   hint: 'Málo i moc škodí — trefit rozmezí' },
  floor:    { badge: '⬇ min.',      hint: 'Nesmí chybět, přebytek neškodí' },
  ceiling:  { badge: '⬆ pozor',     hint: 'Přebytek se kumuluje a škodí' },
  flex:     { badge: '≈ orientačně', hint: 'Stačí dlouhodobý průměr' },
};

/**
 * Bezpečné horní limity (Safe Upper Limit) per 1000 kcal ME.
 * Nad touto hranicí hrozí toxicita (hypervitaminóza / předávkování).
 * Zdroj: NRC 2006 SUL, převedeno na 1000 kcal; u nejistých hodnot zvoleno
 * konzervativně (radši varovat dřív). Nutrienty bez záznamu nemají praktický
 * strop v běžné stravě.
 */
export const NRC_SUL_PER_1000KCAL: Record<string, number> = {
  // Vit. A: hypervitaminóza A (krční exostózy) z jaterních diet. RA 3334 →
  // strop ~10× RA (běžně uváděná bezpečná hranice pro kočky)
  vitA_IU:  33333,
  // Vit. D3: předávkování → hyperkalcémie. Konzervativní praktický strop
  vitD3_IU: 1800,
  // Zinek: NRC SUL ~600 mg/kg diety ÷ 4
  zinc_mg:  150,
  // Železo: NRC SUL ~800 mg/kg diety ÷ 4
  iron_mg:  200,
};

export const NUTRIENT_LABELS: Record<string, string> = {
  protein_g:     'Bílkoviny',
  calcium_mg:    'Vápník',
  phosphorus_mg: 'Fosfor',
  taurin_mg:     'Taurin',
  vitA_IU:       'Vit. A',
  vitD3_IU:      'Vit. D3',
  vitE_mg:       'Vit. E',
  iron_mg:       'Železo',
  zinc_mg:       'Zinek',
  omega3_mg:     'Omega-3',
};
