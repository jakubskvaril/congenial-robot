import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeightEntry } from '../types';

interface WeightsStore {
  weights: WeightEntry[];
  addWeight: (kg: number, note?: string) => void;
  removeWeight: (id: string) => void;
  latestWeight: number | null;
}

export const useWeightsStore = create<WeightsStore>()(
  persist(
    (set, get) => ({
      weights: [],
      addWeight: (kg, note) => {
        const entry: WeightEntry = {
          id: crypto.randomUUID(),
          date: new Date().toISOString().slice(0, 10),
          kg,
          note,
        };
        set(state => ({ weights: [...state.weights, entry].sort((a, b) => a.date.localeCompare(b.date)) }));
      },
      removeWeight: (id) => set(state => ({ weights: state.weights.filter(w => w.id !== id) })),
      get latestWeight() { const ws = get().weights; return ws.length > 0 ? ws[ws.length - 1].kg : null; },
    }),
    { name: 'bob_weights' }
  )
);
