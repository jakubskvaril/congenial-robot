import { useLogsStore } from '../store/logs';
import { usePouchesStore } from '../store/pouches';
import { useWeightsStore } from '../store/weights';
import { useHealthStore } from '../store/health';
import { useCustomMeatsStore } from '../store/customMeats';
import type { LogEntry, Pouch, WeightEntry, HealthRecord, MeatItem } from '../types';

const REMINDERS_KEY = 'bob-reminders';

export interface BackupFile {
  format: 'bob-denicek';
  version: 1;
  exportedAt: string;
  logs: Record<string, LogEntry[]>;
  pouches: Pouch[];
  weights: WeightEntry[];
  health: HealthRecord[];
  customMeats: MeatItem[];
  reminders?: unknown;
}

export function buildBackup(): BackupFile {
  let reminders: unknown;
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    if (raw) reminders = JSON.parse(raw);
  } catch { /* ignore */ }

  return {
    format: 'bob-denicek',
    version: 1,
    exportedAt: new Date().toISOString(),
    logs: useLogsStore.getState().logs,
    pouches: usePouchesStore.getState().pouches,
    weights: useWeightsStore.getState().weights,
    health: useHealthStore.getState().records,
    customMeats: useCustomMeatsStore.getState().meats,
    reminders,
  };
}

function fileName(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `bobuv-denicek-${stamp}.json`;
}

/**
 * Uloží zálohu. Na iOS se pokusí otevřít systémový share sheet (Soubory,
 * Mail, AirDrop); jinak stáhne soubor klasicky.
 */
export async function exportBackup(): Promise<'shared' | 'downloaded'> {
  const json = JSON.stringify(buildBackup(), null, 2);
  const name = fileName();

  // iOS Safari: sdílení souboru přes share sheet
  try {
    const file = new File([json], name, { type: 'application/json' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Záloha Bobova deníčku' });
      return 'shared';
    }
  } catch { /* uživatel zrušil nebo nepodporováno → stáhni */ }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Ověří, že soubor je záloha z této aplikace. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Soubor není platný JSON.');
  }
  if (!isRecord(data) || data.format !== 'bob-denicek') {
    throw new Error('Tohle není záloha Bobova deníčku.');
  }
  return data as unknown as BackupFile;
}

function byId<T extends { id: string }>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>();
  for (const x of a) map.set(x.id, x);
  for (const x of b) map.set(x.id, x);
  return Array.from(map.values());
}

export interface ImportResult { addedDays: number; addedEntries: number }

/**
 * Nahraje zálohu. `mode: 'merge'` přidá chybějící záznamy k současným
 * (nic se nesmaže), `mode: 'replace'` nahradí vše obsahem souboru.
 */
export function importBackup(backup: BackupFile, mode: 'merge' | 'replace'): ImportResult {
  const cur = useLogsStore.getState().logs;
  let addedDays = 0, addedEntries = 0;

  if (mode === 'replace') {
    useLogsStore.setState({ logs: backup.logs ?? {} });
    usePouchesStore.setState({ pouches: backup.pouches ?? [] });
    useWeightsStore.setState({ weights: [...(backup.weights ?? [])].sort((a, b) => a.date.localeCompare(b.date)) });
    useHealthStore.setState({ records: [...(backup.health ?? [])].sort((a, b) => b.date.localeCompare(a.date)) });
    useCustomMeatsStore.setState({ meats: backup.customMeats ?? [] });
    for (const [date, arr] of Object.entries(backup.logs ?? {})) {
      if (!cur[date]) addedDays++;
      addedEntries += arr.length;
    }
  } else {
    const merged: Record<string, LogEntry[]> = { ...cur };
    for (const [date, arr] of Object.entries(backup.logs ?? {})) {
      const before = merged[date]?.length ?? 0;
      if (!merged[date]) addedDays++;
      merged[date] = byId(merged[date] ?? [], arr);
      addedEntries += merged[date].length - before;
    }
    useLogsStore.setState({ logs: merged });
    usePouchesStore.setState({ pouches: byId(usePouchesStore.getState().pouches, backup.pouches ?? []) });
    useWeightsStore.setState({
      weights: byId(useWeightsStore.getState().weights, backup.weights ?? [])
        .sort((a, b) => a.date.localeCompare(b.date)),
    });
    useHealthStore.setState({
      records: byId(useHealthStore.getState().records, backup.health ?? [])
        .sort((a, b) => b.date.localeCompare(a.date)),
    });
    useCustomMeatsStore.setState({
      meats: byId(useCustomMeatsStore.getState().meats, backup.customMeats ?? []),
    });
  }

  if (backup.reminders) {
    try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(backup.reminders)); } catch { /* ignore */ }
  }
  return { addedDays, addedEntries };
}
