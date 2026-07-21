import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LogEntry } from '../types';
import { todayISO } from '../utils/nutrients';

interface LogsStore {
  logs: Record<string, LogEntry[]>;
  addEntry: (entry: Omit<LogEntry, 'id'>) => void;
  removeEntry: (date: string, id: string) => void;
  getDay: (date: string) => LogEntry[];
}

export const useLogsStore = create<LogsStore>()(
  persist(
    (set, get) => ({
      logs: {},
      addEntry: (entry) => {
        const id = crypto.randomUUID();
        const newEntry: LogEntry = { ...entry, id };
        set(state => ({
          logs: {
            ...state.logs,
            [entry.date]: [...(state.logs[entry.date] ?? []), newEntry],
          },
        }));
      },
      removeEntry: (date, id) => {
        set(state => {
          const remaining = (state.logs[date] ?? []).filter(e => e.id !== id);
          const logs = { ...state.logs };
          if (remaining.length > 0) {
            logs[date] = remaining;
          } else {
            delete logs[date]; // prázdný den nenechávej v úložišti
          }
          return { logs };
        });
      },
      getDay: (date) => get().logs[date] ?? [],
    }),
    { name: 'bob_logs' }
  )
);

export function removeLogItem(logs: LogEntry[], id: string): LogEntry[] {
  return logs.filter(l => l.id !== id);
}

export function addLogEntry(partial: Partial<LogEntry>): LogEntry {
  return {
    id: crypto.randomUUID(),
    date: todayISO(),
    time: '12:00',
    type: 'other',
    name: 'item',
    grams: 0,
    kcal: 0,
    protein_g: 0,
    fat_g: 0,
    calcium_mg: 0,
    phosphorus_mg: 0,
    taurin_mg: 0,
    vitA_IU: 0,
    vitD3_IU: 0,
    vitE_mg: 0,
    iron_mg: 0,
    zinc_mg: 0,
    ...partial,
  };
}
