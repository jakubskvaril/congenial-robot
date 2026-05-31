import type { MeatItem, PouchDraft } from '../types';

export type { PouchDraft };

export interface MeatDraft {
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  ca_mg: number;
  p_mg: number;
  taurin_mg: number;
  vitA_IU: number;
  vitD3_IU: number;
  iron_mg: number;
  zinc_mg: number;
}

/** Parsuje Open Food Facts odpověď jako maso (surová potravina). */
export function parseOffAsMeat(data: unknown): MeatDraft | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.status !== 1) return null;
  const p = d.product as Record<string, unknown>;
  if (!p) return null;
  const n = (p.nutriments as Record<string, number>) ?? {};

  const name = String(
    p.product_name_cs ?? p.product_name ?? p.product_name_en ?? 'Neznámý produkt'
  ).trim();

  // OFF ukládá minerály v g/100g → převod na mg/100g: × 1000
  const ca_mg  = Math.round((n['calcium_100g']     ?? 0) * 1000);
  const p_mg   = Math.round((n['phosphorus_100g']   ?? 0) * 1000);
  const iron   = Math.round((n['iron_100g']          ?? 0) * 1000 * 10) / 10;
  const zinc   = Math.round((n['zinc_100g']          ?? 0) * 1000 * 10) / 10;

  // Vitamín A: OFF v g → µg retinolu → IU (1 IU = 0.3 µg retinolu)
  const vitA_g    = n['vitamin-a_100g'] ?? 0;
  const vitA_IU   = vitA_g > 0 ? Math.round((vitA_g * 1e6) / 0.3) : 0;

  // Vitamín D: OFF v µg/100g → IU (1 IU = 0.025 µg)
  const vitD_mcg  = n['vitamin-d_100g'] ? n['vitamin-d_100g'] * 1e6 : 0;
  const vitD3_IU  = vitD_mcg > 0 ? Math.round(vitD_mcg / 0.025) : 0;

  return {
    name,
    kcal:      n['energy-kcal_100g'] ?? Math.round((n['energy_100g'] ?? 0) / 4.184),
    protein:   n['proteins_100g']    ?? 0,
    fat:       n['fat_100g']         ?? 0,
    ca_mg,
    p_mg,
    taurin_mg: 0, // taurin není v OFF; uživatel vyplní ručně nebo použijeme 50 jako default
    vitA_IU,
    vitD3_IU,
    iron_mg:   iron,
    zinc_mg:   zinc,
  };
}

/**
 * Vrátí true pokud EAN je interní kód obchodu (proměnlivá váha).
 * V ČR i EU: prefix "20"–"29" = internal variable-weight codes.
 * Tyto kódy NEJSOU v žádné globální databázi.
 */
export function isStoreInternalEan(ean: string): boolean {
  if (ean.length !== 13) return false;
  const prefix = parseInt(ean.substring(0, 2), 10);
  return prefix >= 20 && prefix <= 29;
}

/** Hledá EAN jako maso v Open Food Facts (ne pet food). */
export async function lookupEanAsMeat(ean: string): Promise<MeatDraft | null> {
  if (isStoreInternalEan(ean)) return null; // interní kód obchodu, neposílej požadavek

  for (const base of [
    'https://world.openfoodfacts.org',
    'https://cz.openfoodfacts.org',
  ]) {
    try {
      const res = await fetch(`${base}/api/v0/product/${ean}.json`);
      if (!res.ok) continue;
      const result = parseOffAsMeat(await res.json() as unknown);
      if (result) return result;
    } catch { /* síťová chyba, zkus dál */ }
  }
  return null;
}

/** Najde nejpodobnější maso z vestavěné databáze pro návrh hodnot Ca/P. */
export function suggestSimilarMeat(name: string, meats: MeatItem[]): MeatItem | null {
  const lc = name.toLowerCase();
  const keywords: [string[], MeatItem | undefined][] = [
    [['kuř', 'chicken', 'poulet', 'kur'], meats.find(m => m.id === 'chicken_thigh')],
    [['srdce', 'heart'],                  meats.find(m => m.id === 'chicken_heart')],
    [['játra', 'liver', 'leber'],         meats.find(m => m.id === 'chicken_liver')],
    [['hovězí', 'beef', 'rind', 'boeuf'], meats.find(m => m.id === 'beef')],
    [['losos', 'salmon', 'lachs'],        meats.find(m => m.id === 'salmon')],
    [['krůt', 'turkey', 'puten'],         meats.find(m => m.id === 'turkey')],
    [['jehněč', 'lamb', 'lamm'],          meats.find(m => m.id === 'lamb')],
    [['vepř', 'pork', 'schwein'],         meats.find(m => m.id === 'pork_leg')],
  ];
  for (const [keys, meat] of keywords) {
    if (meat && keys.some(k => lc.includes(k))) return meat;
  }
  return null;
}

// Lokální databáze — generovaná scriptem scripts/scrape-granulka.mjs
// Soubor neexistuje dokud scraper nespustíš; import je dynamický aby build nepadal
let _localDb: Record<string, PouchDraft> | null = null;
async function getLocalDb(): Promise<Record<string, PouchDraft>> {
  if (_localDb) return _localDb;
  try {
    const mod = await import('../data/localEanDb') as { LOCAL_EAN_DB: Record<string, PouchDraft> };
    _localDb = mod.LOCAL_EAN_DB;
  } catch {
    _localDb = {};
  }
  return _localDb;
}

export function parseOpenFoodFacts(data: unknown): PouchDraft | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.status !== 1) return null;
  const p = d.product as Record<string, unknown>;
  if (!p) return null;
  const n = (p.nutriments as Record<string, number>) ?? {};
  return {
    name: String(p.product_name ?? p.product_name_cs ?? 'Neznámý produkt'),
    brand: String(p.brands ?? 'Neznámá značka'),
    meatPercent: null,
    isKitten: false,
    grainFree: false,
    isComplete: true,
    nutrients: {
      protein: n['proteins_100g'] ?? 0,
      fat: n['fat_100g'] ?? 0,
      moisture: n['water_100g'] ?? 80,
      ash: n['ash_100g'],
      fiber: n['fiber_100g'],
    },
    kcalPer100g: n['energy-kcal_100g'] ?? 0,
    score: 5,
    notes: String(p.ingredients_text_cs ?? p.ingredients_text ?? ''),
    barcode: undefined,
  };
}

export async function lookupBarcode(ean: string): Promise<PouchDraft | null> {
  // 0) Lokální databáze ze scraperu (nejrychlejší, offline)
  const local = await getLocalDb();
  if (local[ean]) return local[ean];

  // 1) Open Pet Food Facts — databáze krmiv pro zvířata
  try {
    const res = await fetch(`https://world.openpetfoodfacts.org/api/v0/product/${ean}.json`);
    if (res.ok) {
      const data = await res.json() as unknown;
      const result = parseOpenFoodFacts(data);
      if (result) return result;
    }
  } catch { /* síťová chyba, zkus dál */ }

  // 2) Open Food Facts — obecná databáze (záloha)
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${ean}.json`);
    if (res.ok) {
      const data = await res.json() as unknown;
      const result = parseOpenFoodFacts(data);
      if (result) return result;
    }
  } catch { /* síťová chyba */ }

  return null;
}
