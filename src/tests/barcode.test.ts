import { describe, it, expect } from 'vitest';
import { parseOpenFoodFacts } from '../utils/barcode';

const mockOFFSuccess = {
  status: 1,
  product: {
    product_name: 'Leonardo Adult Kitten',
    brands: 'Leonardo',
    nutriments: {
      'proteins_100g': 9.5,
      'fat_100g': 5.0,
      'water_100g': 80,
      'energy-kcal_100g': 75,
    },
    ingredients_text_cs: 'Kuřecí maso 45%, …',
  },
};

const mockOFFNotFound = { status: 0 };

describe('parseOpenFoodFacts', () => {
  it('returns PouchDraft from valid OpenFoodFacts response', () => {
    const result = parseOpenFoodFacts(mockOFFSuccess);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Leonardo Adult Kitten');
    expect(result!.brand).toBe('Leonardo');
    expect(result!.nutrients.protein).toBe(9.5);
    expect(result!.nutrients.fat).toBe(5.0);
    expect(result!.kcalPer100g).toBe(75);
  });

  it('returns null when status !== 1', () => {
    expect(parseOpenFoodFacts(mockOFFNotFound)).toBeNull();
  });

  it('returns null for malformed data', () => {
    expect(parseOpenFoodFacts({})).toBeNull();
    expect(parseOpenFoodFacts(null)).toBeNull();
    expect(parseOpenFoodFacts('invalid')).toBeNull();
  });

  it('uses fallback brand when brands missing', () => {
    const nobrands = { ...mockOFFSuccess, product: { ...mockOFFSuccess.product, brands: undefined } };
    const result = parseOpenFoodFacts(nobrands);
    expect(result!.brand).toBe('Neznámá značka');
  });

  it('defaults score to 5', () => {
    const result = parseOpenFoodFacts(mockOFFSuccess);
    expect(result!.score).toBe(5);
  });
});
