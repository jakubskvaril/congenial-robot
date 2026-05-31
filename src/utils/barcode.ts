import type { PouchDraft } from '../types';

export type { PouchDraft };

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
