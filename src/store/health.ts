import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HealthRecord } from '../types';

interface HealthStore {
  records: HealthRecord[];
  addRecord: (r: Omit<HealthRecord, 'id'>) => void;
  removeRecord: (id: string) => void;
}

export const useHealthStore = create<HealthStore>()(
  persist(
    (set) => ({
      records: [],
      addRecord: (r) => set(state => ({
        records: [...state.records, { ...r, id: crypto.randomUUID() }].sort((a, b) => b.date.localeCompare(a.date)),
      })),
      removeRecord: (id) => set(state => ({ records: state.records.filter(r => r.id !== id) })),
    }),
    { name: 'bob_health' }
  )
);
