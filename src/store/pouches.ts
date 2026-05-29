import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Pouch } from '../types';

const SEED: Pouch[] = [
  {
    id: 'leonardo-kitten',
    name: 'Kitten Drůbeží',
    brand: 'Leonardo',
    meatPercent: 70,
    isKitten: true,
    grainFree: true,
    isComplete: true,
    nutrients: { protein: 11.5, fat: 5.7, moisture: 81, taurinMgKg: 1500 },
    kcalPer100g: 95,
    score: 9,
    notes: 'Prémiová kapsička pro koťata',
    stockCount: 0,
  },
];

interface PouchesStore {
  pouches: Pouch[];
  addPouch: (p: Omit<Pouch, 'id'>) => void;
  removePouch: (id: string) => void;
  updatePouch: (id: string, updates: Partial<Pouch>) => void;
  decrementStock: (id: string) => void;
}

export const usePouchesStore = create<PouchesStore>()(
  persist(
    (set) => ({
      pouches: SEED,
      addPouch: (p) => set(state => ({
        pouches: [...state.pouches, { ...p, id: crypto.randomUUID() }],
      })),
      removePouch: (id) => set(state => ({
        pouches: state.pouches.filter(p => p.id !== id),
      })),
      updatePouch: (id, updates) => set(state => ({
        pouches: state.pouches.map(p => p.id === id ? { ...p, ...updates } : p),
      })),
      decrementStock: (id) => set(state => ({
        pouches: state.pouches.map(p =>
          p.id === id ? { ...p, stockCount: Math.max(0, (p.stockCount ?? 0) - 1) } : p
        ),
      })),
    }),
    { name: 'bob_pouches' }
  )
);
