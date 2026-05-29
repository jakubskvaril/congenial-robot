import type { Pouch } from '../types';

export interface PouchDraft extends Omit<Pouch, 'id' | 'stockCount'> {}

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
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${ean}.json`);
    const data = await res.json() as unknown;
    return parseOpenFoodFacts(data);
  } catch {
    return null;
  }
}
