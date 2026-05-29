export const BOB = {
  name: 'Bob',
  birthDate: '2025-12-17',
  breed: 'nevska_maskarada',
  breedLabel: 'Nevská maškaráda',
  sex: 'male' as const,
  neutered: false,
};

export type FoodType = 'meat' | 'pouch' | 'felini' | 'other';
export type LifeStage = 'kitten' | 'adult' | 'senior';

export interface MeatItem {
  id: string;
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

export interface LogEntry {
  id: string;
  date: string;
  time: string;
  type: FoodType;
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  fat_g: number;
  calcium_mg: number;
  phosphorus_mg: number;
  taurin_mg: number;
  vitA_IU: number;
  vitD3_IU: number;
  vitE_mg: number;
  iron_mg: number;
  zinc_mg: number;
  feliniDose_g?: number;
  pouchId?: string;
}

export interface PouchNutrients {
  protein: number;
  fat: number;
  moisture: number;
  ash?: number;
  fiber?: number;
  calcium?: number;
  phosphorus?: number;
  taurinMgKg?: number;
  vitaminA?: number;
  vitaminD3?: number;
  vitaminE?: number;
}

export interface Pouch {
  id: string;
  name: string;
  brand: string;
  meatPercent: number | null;
  isKitten: boolean;
  grainFree: boolean;
  isComplete: boolean;
  nutrients: PouchNutrients;
  kcalPer100g: number;
  score: number;
  notes: string;
  stockCount?: number;
  barcode?: string;
}

export interface WeightEntry {
  id: string;
  date: string;
  kg: number;
  note?: string;
}

export interface HealthRecord {
  id: string;
  date: string;
  type: 'vet' | 'deworming' | 'vaccination' | 'daily';
  description: string;
  notes?: string;
  stool?: 1|2|3|4|5;
  energy?: 1|2|3|4|5;
  vomiting?: boolean;
  nextDueDate?: string;
}

export interface FeedingReminder {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  days: number[];
}

export interface EnergyResult {
  kcal: number;
  RER: number;
  factor: number;
  ageMonths: number;
  lifeStage: LifeStage;
  lifeStageLabel: string;
}

export interface DailyNutrients {
  kcal: number;
  protein_g: number;
  fat_g: number;
  calcium_mg: number;
  phosphorus_mg: number;
  taurin_mg: number;
  vitA_IU: number;
  vitD3_IU: number;
  vitE_mg: number;
  iron_mg: number;
  zinc_mg: number;
  caP_ratio: number;
}

export interface NRCTargets {
  protein_g: number;
  calcium_mg: number;
  phosphorus_mg: number;
  taurin_mg: number;
  vitA_IU: number;
  vitD3_IU: number;
  vitE_mg: number;
  iron_mg: number;
  zinc_mg: number;
}

export type TabId = 'diary' | 'pouches' | 'analytics' | 'profile';
