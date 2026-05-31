import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MeatItem } from '../types';

interface CustomMeatsStore {
  meats: MeatItem[];
  addMeat: (m: Omit<MeatItem, 'id'>) => string;
  removeMeat: (id: string) => void;
}

export const useCustomMeatsStore = create<CustomMeatsStore>()(
  persist(
    (set) => ({
      meats: [],
      addMeat: (m) => {
        const id = `custom-${crypto.randomUUID()}`;
        set(state => ({ meats: [...state.meats, { ...m, id }] }));
        return id;
      },
      removeMeat: (id) => set(state => ({
        meats: state.meats.filter(m => m.id !== id),
      })),
    }),
    { name: 'bob_custom_meats' }
  )
);
