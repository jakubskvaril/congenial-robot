import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeightEntry } from '../types';
import { todayISO } from '../utils/nutrients';

interface WeightsStore {
  weights: WeightEntry[];
  addWeight: (kg: number, note?: string, date?: string) => void;
  removeWeight: (id: string) => void;
}

export const useWeightsStore = create<WeightsStore>()(
  persist(
    (set) => ({
      weights: [],
      addWeight: (kg, note, date) => {
        const entry: WeightEntry = {
          id: crypto.randomUUID(),
          date: date || todayISO(),
          kg,
          note,
        };
        set(state => ({ weights: [...state.weights, entry].sort((a, b) => a.date.localeCompare(b.date)) }));
      },
      removeWeight: (id) => set(state => ({ weights: state.weights.filter(w => w.id !== id) })),
    }),
    { name: 'bob_weights' }
  )
);

/** Selector: poslední zaznamenaná váha (kg) nebo null. */
export function selectLatestWeight(state: { weights: WeightEntry[] }): number | null {
  return state.weights.length > 0 ? state.weights[state.weights.length - 1].kg : null;
}
