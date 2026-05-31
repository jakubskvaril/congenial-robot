/**
 * High-level cloud sync pro všechny Zustand stores.
 * Strategie: merge-by-id (additivní) — data se nikdy neztratí.
 *   - Na startu: stáhni z Supabase, spoj s lokálními daty (union by id)
 *   - Na každý zápis: debounced push do Supabase
 */
import { useLogsStore } from '../store/logs';
import { usePouchesStore } from '../store/pouches';
import { useWeightsStore } from '../store/weights';
import { useHealthStore } from '../store/health';
import { useCustomMeatsStore } from '../store/customMeats';
import { pushStore, pullStore } from './sync';
import type { LogEntry, Pouch, WeightEntry, HealthRecord, MeatItem } from '../types';

let _pulling = false; // zabrání zpětné smyčce pull → subscribe → push

// ── Subscriptions ─────────────────────────────────────────────────────────────

export function initStoreSubscriptions() {
  useLogsStore.subscribe(state => {
    if (!_pulling) pushStore('bob_logs', { logs: state.logs });
  });
  usePouchesStore.subscribe(state => {
    if (!_pulling) pushStore('bob_pouches', { pouches: state.pouches });
  });
  useWeightsStore.subscribe(state => {
    if (!_pulling) pushStore('bob_weights', { weights: state.weights });
  });
  useHealthStore.subscribe(state => {
    if (!_pulling) pushStore('bob_health', { records: state.records });
  });
  useCustomMeatsStore.subscribe(state => {
    if (!_pulling) pushStore('bob_custom_meats', { meats: state.meats });
  });
}

// ── Pull & merge ───────────────────────────────────────────────────────────────

function byId<T extends { id: string }>(local: T[], cloud: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of cloud)  map.set(item.id, item);
  for (const item of local)  map.set(item.id, item); // local wins on conflict
  return Array.from(map.values());
}

export async function pullAllFromCloud(): Promise<void> {
  _pulling = true;
  try {
    const [cloudLogs, cloudPouches, cloudWeights, cloudHealth, cloudMeats] =
      await Promise.all([
        pullStore<{ logs: Record<string, LogEntry[]> }>('bob_logs'),
        pullStore<{ pouches: Pouch[] }>('bob_pouches'),
        pullStore<{ weights: WeightEntry[] }>('bob_weights'),
        pullStore<{ records: HealthRecord[] }>('bob_health'),
        pullStore<{ meats: MeatItem[] }>('bob_custom_meats'),
      ]);

    // Logy — merge per-day arrays
    if (cloudLogs?.logs) {
      const local = useLogsStore.getState().logs;
      const merged: Record<string, LogEntry[]> = { ...cloudLogs.logs };
      for (const [date, entries] of Object.entries(local)) {
        merged[date] = byId(entries, cloudLogs.logs[date] ?? []);
      }
      useLogsStore.setState({ logs: merged });
    }

    // Kapsičky — merge by id, local wins
    if (cloudPouches?.pouches) {
      const local = usePouchesStore.getState().pouches;
      usePouchesStore.setState({ pouches: byId(local, cloudPouches.pouches) });
    }

    // Váhy
    if (cloudWeights?.weights) {
      const local = useWeightsStore.getState().weights;
      useWeightsStore.setState({
        weights: byId(local, cloudWeights.weights)
          .sort((a, b) => a.date.localeCompare(b.date)),
      });
    }

    // Zdravotní záznamy
    if (cloudHealth?.records) {
      const local = useHealthStore.getState().records;
      useHealthStore.setState({
        records: byId(local, cloudHealth.records)
          .sort((a, b) => b.date.localeCompare(a.date)),
      });
    }

    // Vlastní masa
    if (cloudMeats?.meats) {
      const local = useCustomMeatsStore.getState().meats;
      useCustomMeatsStore.setState({ meats: byId(local, cloudMeats.meats) });
    }
  } finally {
    _pulling = false;
  }
}
